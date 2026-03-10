variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region for all resources"
  type        = string
  default     = "us-central1"
}

variable "zone" {
  description = "GCP zone for zonal resources"
  type        = string
  default     = "us-central1-a"
}

variable "environment" {
  description = "Environment name (prod, staging)"
  type        = string
  default     = "prod"
}

# Cloud SQL
variable "db_tier" {
  description = "Cloud SQL instance tier"
  type        = string
  default     = "db-g1-small"
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "ignite"
}

variable "db_user" {
  description = "Database user"
  type        = string
  default     = "ignite"
}

# Cloud Run
variable "cloud_run_min_instances" {
  description = "Minimum Cloud Run instances (0 = scale to zero)"
  type        = number
  default     = 0
}

variable "cloud_run_max_instances" {
  description = "Maximum Cloud Run instances"
  type        = number
  default     = 3
}

variable "cloud_run_cpu" {
  description = "Cloud Run CPU allocation"
  type        = string
  default     = "1"
}

variable "cloud_run_memory" {
  description = "Cloud Run memory allocation"
  type        = string
  default     = "1Gi"
}

# Redis
variable "redis_tier" {
  description = "Memorystore Redis tier (BASIC or STANDARD_HA)"
  type        = string
  default     = "BASIC"
}

variable "redis_memory_size_gb" {
  description = "Redis memory size in GB"
  type        = number
  default     = 1
}

# Domain
variable "domain" {
  description = "Custom domain (leave empty to use Cloud Run default URL)"
  type        = string
  default     = ""
}
