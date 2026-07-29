output "service_url" {
  description = "Cloud Run URL for the authenticated state-service integration."
  value       = google_cloud_run_v2_service.state.uri
}

output "migration_job_name" {
  description = "Cloud Run job to execute once after each schema-compatible release."
  value       = google_cloud_run_v2_job.migration.name
}

output "database_connection_name" {
  description = "Cloud SQL connection name used by Cloud Run."
  value       = google_sql_database_instance.state.connection_name
}

output "runtime_database_secret" {
  description = "Secret Manager secret containing the runtime database URL."
  value       = google_secret_manager_secret.runtime_database_url.secret_id
}

output "migration_database_secret" {
  description = "Secret Manager secret containing the migration database URL."
  value       = google_secret_manager_secret.migration_database_url.secret_id
}

output "runtime_service_account" {
  description = "Least-privileged Cloud Run runtime service account."
  value       = google_service_account.runtime.email
}

output "migration_service_account" {
  description = "Separate Cloud Run migration-job service account."
  value       = google_service_account.migration.email
}

output "source_envelope_kms_key" {
  description = "Cloud KMS key used to wrap per-source data-encryption keys."
  value       = google_kms_crypto_key.source_envelope.id
}
