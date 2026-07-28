variable "project_id" {
  description = "Google Cloud project that owns the isolated Marketing OS state service."
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{4,28}[a-z0-9]$", var.project_id))
    error_message = "project_id must be a valid Google Cloud project ID."
  }
}

variable "region" {
  description = "Google Cloud region for Cloud Run, Cloud SQL, KMS, and the VPC subnet."
  type        = string
  default     = "us-west1"
}

variable "environment" {
  description = "Short environment name used in resource labels."
  type        = string
  default     = "production"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,14}$", var.environment))
    error_message = "environment must contain 2-15 lowercase letters, numbers, or hyphens."
  }
}

variable "service_name" {
  description = "Cloud Run service name and resource-name prefix."
  type        = string
  default     = "guild-marketing-os-state"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{0,47}[a-z0-9]$", var.service_name))
    error_message = "service_name must be a valid 2-49 character Cloud Run service name."
  }
}

variable "container_image" {
  description = "Immutable state-service container image. Tags are rejected; use an @sha256 digest."
  type        = string

  validation {
    condition     = can(regex("@sha256:[0-9a-f]{64}$", var.container_image))
    error_message = "container_image must be pinned to an immutable sha256 digest."
  }
}

variable "database_tier" {
  description = "Cloud SQL machine tier."
  type        = string
  default     = "db-custom-2-7680"
}

variable "database_disk_size_gb" {
  description = "Initial Cloud SQL SSD size in GiB. Automatic growth remains enabled."
  type        = number
  default     = 20

  validation {
    condition     = var.database_disk_size_gb >= 10
    error_message = "database_disk_size_gb must be at least 10."
  }
}

variable "database_name" {
  description = "PostgreSQL database name."
  type        = string
  default     = "marketing_os"

  validation {
    condition     = can(regex("^[a-z_][a-z0-9_]{0,62}$", var.database_name))
    error_message = "database_name must be a valid lowercase PostgreSQL identifier."
  }
}

variable "database_app_role" {
  description = "Least-privileged PostgreSQL role used by the running service."
  type        = string
  default     = "marketing_os_app"

  validation {
    condition     = can(regex("^[a-z_][a-z0-9_]{0,62}$", var.database_app_role))
    error_message = "database_app_role must be a valid lowercase PostgreSQL identifier."
  }
}

variable "database_migration_role" {
  description = "Separate PostgreSQL role used only by the migration job."
  type        = string
  default     = "marketing_os_migrator"

  validation {
    condition     = can(regex("^[a-z_][a-z0-9_]{0,62}$", var.database_migration_role))
    error_message = "database_migration_role must be a valid lowercase PostgreSQL identifier."
  }
}

variable "network_cidr" {
  description = "CIDR for the regional Cloud Run VPC subnet."
  type        = string
  default     = "10.42.0.0/24"
}

variable "private_service_prefix_length" {
  description = "Prefix length reserved for private service networking."
  type        = number
  default     = 16

  validation {
    condition     = var.private_service_prefix_length >= 16 && var.private_service_prefix_length <= 24
    error_message = "private_service_prefix_length must be between 16 and 24."
  }
}

variable "deletion_protection" {
  description = "Protect Cloud Run and Cloud SQL resources from accidental deletion."
  type        = bool
  default     = true
}

variable "max_instances" {
  description = "Maximum Cloud Run state-service instances."
  type        = number
  default     = 10

  validation {
    condition     = var.max_instances >= 1 && var.max_instances <= 100
    error_message = "max_instances must be between 1 and 100."
  }
}

variable "database_pool_size" {
  description = "Maximum PostgreSQL connections per Cloud Run instance."
  type        = number
  default     = 10

  validation {
    condition     = var.database_pool_size >= 1 && var.database_pool_size <= 50
    error_message = "database_pool_size must be between 1 and 50."
  }
}

variable "rate_limit_max_requests" {
  description = "Maximum requests per verified tenant and actor in each rate-limit window."
  type        = number
  default     = 120
}

variable "rate_limit_window_seconds" {
  description = "Tenant-and-actor rate-limit window in seconds."
  type        = number
  default     = 60
}

variable "guild_delegated_issuer" {
  description = "Exact issuer for Guild-signed delegated identity JWTs. Do not use a placeholder."
  type        = string

  validation {
    condition     = can(regex("^https://", var.guild_delegated_issuer))
    error_message = "guild_delegated_issuer must be an HTTPS URL supplied by Guild."
  }
}

variable "guild_delegated_audience" {
  description = "Exact audience for this integration's Guild-signed delegated identity JWTs."
  type        = string

  validation {
    condition     = length(trimspace(var.guild_delegated_audience)) >= 8
    error_message = "guild_delegated_audience must be a non-placeholder audience."
  }
}

variable "guild_delegated_jwks_url" {
  description = "Guild JWKS URL used to verify delegated identity JWTs. Do not use a placeholder."
  type        = string

  validation {
    condition     = can(regex("^https://", var.guild_delegated_jwks_url))
    error_message = "guild_delegated_jwks_url must be an HTTPS URL supplied by Guild."
  }
}
