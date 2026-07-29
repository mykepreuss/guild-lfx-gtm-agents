locals {
  prefix = "${var.service_name}-${var.environment}"
  labels = {
    application = "guild-marketing-os"
    component   = "state-service"
    environment = var.environment
    managed-by  = "terraform"
  }

  required_services = toset([
    "cloudkms.googleapis.com",
    "run.googleapis.com",
    "secretmanager.googleapis.com",
    "servicenetworking.googleapis.com",
    "sqladmin.googleapis.com",
  ])
}

resource "google_project_service" "required" {
  for_each = local.required_services

  project            = var.project_id
  service            = each.value
  disable_on_destroy = false
}

resource "google_compute_network" "state" {
  name                    = "${local.prefix}-network"
  project                 = var.project_id
  auto_create_subnetworks = false

  depends_on = [google_project_service.required]
}

resource "google_compute_subnetwork" "state" {
  name                     = "${local.prefix}-${var.region}"
  project                  = var.project_id
  region                   = var.region
  network                  = google_compute_network.state.id
  ip_cidr_range            = var.network_cidr
  private_ip_google_access = true
}

resource "google_compute_global_address" "private_services" {
  name          = "${local.prefix}-private-services"
  project       = var.project_id
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = var.private_service_prefix_length
  network       = google_compute_network.state.id
}

resource "google_service_networking_connection" "private_services" {
  network                 = google_compute_network.state.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_services.name]

  depends_on = [google_project_service.required]
}

resource "google_kms_key_ring" "state" {
  name     = "${local.prefix}-keys"
  project  = var.project_id
  location = var.region

  depends_on = [google_project_service.required]
}

resource "google_kms_crypto_key" "source_envelope" {
  name            = "source-envelope"
  key_ring        = google_kms_key_ring.state.id
  rotation_period = "7776000s"

  lifecycle {
    prevent_destroy = true
  }
}

resource "google_kms_crypto_key" "database" {
  name            = "cloud-sql"
  key_ring        = google_kms_key_ring.state.id
  rotation_period = "7776000s"

  lifecycle {
    prevent_destroy = true
  }
}

resource "google_project_service_identity" "cloud_sql" {
  provider = google-beta

  project = var.project_id
  service = "sqladmin.googleapis.com"

  depends_on = [google_project_service.required]
}

resource "google_kms_crypto_key_iam_member" "cloud_sql" {
  crypto_key_id = google_kms_crypto_key.database.id
  role          = "roles/cloudkms.cryptoKeyEncrypterDecrypter"
  member        = "serviceAccount:${google_project_service_identity.cloud_sql.email}"
}

resource "google_sql_database_instance" "state" {
  name                = local.prefix
  project             = var.project_id
  region              = var.region
  database_version    = "POSTGRES_16"
  encryption_key_name = google_kms_crypto_key.database.id
  deletion_protection = var.deletion_protection

  settings {
    tier              = var.database_tier
    availability_type = "REGIONAL"
    disk_type         = "PD_SSD"
    disk_size         = var.database_disk_size_gb
    disk_autoresize   = true

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
      transaction_log_retention_days = 7

      backup_retention_settings {
        retained_backups = 14
        retention_unit   = "COUNT"
      }
    }

    insights_config {
      query_insights_enabled  = true
      query_string_length     = 1024
      record_application_tags = true
      record_client_address   = false
    }

    ip_configuration {
      ipv4_enabled                                  = false
      private_network                               = google_compute_network.state.id
      enable_private_path_for_google_cloud_services = true
      ssl_mode                                      = "ENCRYPTED_ONLY"
    }

    maintenance_window {
      day          = 7
      hour         = 9
      update_track = "stable"
    }

    user_labels = local.labels
  }

  depends_on = [
    google_kms_crypto_key_iam_member.cloud_sql,
    google_service_networking_connection.private_services,
  ]
}

resource "google_sql_database" "state" {
  name     = var.database_name
  project  = var.project_id
  instance = google_sql_database_instance.state.name
}

resource "random_password" "runtime_database" {
  length  = 32
  special = true
}

resource "random_password" "migration_database" {
  length  = 32
  special = true
}

resource "google_sql_user" "runtime" {
  name     = var.database_app_role
  project  = var.project_id
  instance = google_sql_database_instance.state.name
  password = random_password.runtime_database.result
}

resource "google_sql_user" "migration" {
  name     = var.database_migration_role
  project  = var.project_id
  instance = google_sql_database_instance.state.name
  password = random_password.migration_database.result
}

resource "google_secret_manager_secret" "runtime_database_url" {
  secret_id = "${local.prefix}-database-url"
  project   = var.project_id
  labels    = local.labels

  replication {
    auto {}
  }

  depends_on = [google_project_service.required]
}

resource "google_secret_manager_secret_version" "runtime_database_url" {
  secret      = google_secret_manager_secret.runtime_database_url.id
  secret_data = "postgresql://${urlencode(var.database_app_role)}:${urlencode(random_password.runtime_database.result)}@localhost/${urlencode(var.database_name)}?host=${urlencode("/cloudsql/${google_sql_database_instance.state.connection_name}")}"
}

resource "google_secret_manager_secret" "migration_database_url" {
  secret_id = "${local.prefix}-migration-database-url"
  project   = var.project_id
  labels    = local.labels

  replication {
    auto {}
  }

  depends_on = [google_project_service.required]
}

resource "google_secret_manager_secret_version" "migration_database_url" {
  secret      = google_secret_manager_secret.migration_database_url.id
  secret_data = "postgresql://${urlencode(var.database_migration_role)}:${urlencode(random_password.migration_database.result)}@localhost/${urlencode(var.database_name)}?host=${urlencode("/cloudsql/${google_sql_database_instance.state.connection_name}")}"
}

resource "google_service_account" "runtime" {
  account_id   = substr("${local.prefix}-runtime", 0, 30)
  display_name = "Marketing OS state runtime (${var.environment})"
  project      = var.project_id
}

resource "google_service_account" "migration" {
  account_id   = substr("${local.prefix}-migrate", 0, 30)
  display_name = "Marketing OS state migration (${var.environment})"
  project      = var.project_id
}

resource "google_project_iam_member" "runtime_roles" {
  for_each = toset([
    "roles/cloudsql.client",
    "roles/logging.logWriter",
    "roles/monitoring.metricWriter",
  ])

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.runtime.email}"
}

resource "google_project_iam_member" "migration_roles" {
  for_each = toset([
    "roles/cloudsql.client",
    "roles/logging.logWriter",
  ])

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.migration.email}"
}

resource "google_secret_manager_secret_iam_member" "runtime_database" {
  project   = var.project_id
  secret_id = google_secret_manager_secret.runtime_database_url.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.runtime.email}"
}

resource "google_secret_manager_secret_iam_member" "migration_database" {
  project   = var.project_id
  secret_id = google_secret_manager_secret.migration_database_url.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.migration.email}"
}

resource "google_kms_crypto_key_iam_member" "runtime_source_envelope" {
  crypto_key_id = google_kms_crypto_key.source_envelope.id
  role          = "roles/cloudkms.cryptoKeyEncrypterDecrypter"
  member        = "serviceAccount:${google_service_account.runtime.email}"
}

resource "google_cloud_run_v2_service" "state" {
  name                = var.service_name
  project             = var.project_id
  location            = var.region
  ingress             = "INGRESS_TRAFFIC_ALL"
  deletion_protection = var.deletion_protection
  labels              = local.labels

  template {
    service_account                  = google_service_account.runtime.email
    timeout                          = "60s"
    max_instance_request_concurrency = 40

    scaling {
      min_instance_count = 0
      max_instance_count = var.max_instances
    }

    vpc_access {
      egress = "PRIVATE_RANGES_ONLY"

      network_interfaces {
        network    = google_compute_network.state.name
        subnetwork = google_compute_subnetwork.state.name
      }
    }

    volumes {
      name = "cloudsql"

      cloud_sql_instance {
        instances = [google_sql_database_instance.state.connection_name]
      }
    }

    containers {
      image = var.container_image

      ports {
        container_port = 8080
      }

      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }

      env {
        name = "DATABASE_URL"

        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.runtime_database_url.secret_id
            version = "latest"
          }
        }
      }

      env {
        name  = "DATABASE_POOL_SIZE"
        value = tostring(var.database_pool_size)
      }

      env {
        name  = "KMS_KEY_NAME"
        value = google_kms_crypto_key.source_envelope.id
      }

      env {
        name  = "GUILD_DELEGATED_ISSUER"
        value = var.guild_delegated_issuer
      }

      env {
        name  = "GUILD_DELEGATED_AUDIENCE"
        value = var.guild_delegated_audience
      }

      env {
        name  = "GUILD_DELEGATED_JWKS_URL"
        value = var.guild_delegated_jwks_url
      }

      env {
        name  = "RATE_LIMIT_MAX_REQUESTS"
        value = tostring(var.rate_limit_max_requests)
      }

      env {
        name  = "RATE_LIMIT_WINDOW_SECONDS"
        value = tostring(var.rate_limit_window_seconds)
      }

      startup_probe {
        initial_delay_seconds = 0
        timeout_seconds       = 3
        period_seconds        = 5
        failure_threshold     = 12

        tcp_socket {
          port = 8080
        }
      }

      liveness_probe {
        initial_delay_seconds = 10
        timeout_seconds       = 3
        period_seconds        = 10
        failure_threshold     = 3

        http_get {
          path = "/healthz"
          port = 8080
        }
      }
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  depends_on = [
    google_kms_crypto_key_iam_member.runtime_source_envelope,
    google_project_iam_member.runtime_roles,
    google_secret_manager_secret_iam_member.runtime_database,
    google_secret_manager_secret_version.runtime_database_url,
  ]
}

# Guild must reach the HTTPS endpoint, but every non-health request still fails
# closed unless it carries a valid Guild-signed delegated JWT. Cloud Run IAM is
# not used as a substitute for tenant identity.
resource "google_cloud_run_v2_service_iam_member" "public_ingress" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.state.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_v2_job" "migration" {
  name                = "${var.service_name}-migrate"
  project             = var.project_id
  location            = var.region
  deletion_protection = var.deletion_protection
  labels              = local.labels

  template {
    template {
      service_account = google_service_account.migration.email
      timeout         = "600s"
      max_retries     = 1

      vpc_access {
        egress = "PRIVATE_RANGES_ONLY"

        network_interfaces {
          network    = google_compute_network.state.name
          subnetwork = google_compute_subnetwork.state.name
        }
      }

      volumes {
        name = "cloudsql"

        cloud_sql_instance {
          instances = [google_sql_database_instance.state.connection_name]
        }
      }

      containers {
        image   = var.container_image
        command = ["npm"]
        args    = ["run", "migrate"]

        volume_mounts {
          name       = "cloudsql"
          mount_path = "/cloudsql"
        }

        env {
          name = "DATABASE_ADMIN_URL"

          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.migration_database_url.secret_id
              version = "latest"
            }
          }
        }

        env {
          name  = "DATABASE_APP_ROLE"
          value = var.database_app_role
        }
      }
    }
  }

  depends_on = [
    google_project_iam_member.migration_roles,
    google_secret_manager_secret_iam_member.migration_database,
    google_secret_manager_secret_version.migration_database_url,
    google_sql_user.runtime,
  ]
}
