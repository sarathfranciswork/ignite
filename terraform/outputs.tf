output "app_url" {
  description = "Cloud Run app URL"
  value       = google_cloud_run_v2_service.app.uri
}

output "worker_url" {
  description = "Cloud Run worker URL (internal)"
  value       = google_cloud_run_v2_service.worker.uri
}

output "db_instance_name" {
  description = "Cloud SQL instance connection name"
  value       = google_sql_database_instance.postgres.connection_name
}

output "db_private_ip" {
  description = "Cloud SQL private IP"
  value       = google_sql_database_instance.postgres.private_ip_address
  sensitive   = true
}

output "redis_host" {
  description = "Memorystore Redis host"
  value       = google_redis_instance.redis.host
  sensitive   = true
}

output "redis_port" {
  description = "Memorystore Redis port"
  value       = google_redis_instance.redis.port
}

output "artifact_registry" {
  description = "Artifact Registry URL for Docker images"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/ignite"
}

output "storage_bucket" {
  description = "GCS bucket for file uploads"
  value       = google_storage_bucket.uploads.name
}

output "github_wif_provider" {
  description = "Workload Identity Federation provider (for GitHub Actions)"
  value       = google_iam_workload_identity_pool_provider.github.name
}

output "github_sa_email" {
  description = "GitHub Actions service account email"
  value       = google_service_account.github_actions.email
}

output "cloud_run_sa_email" {
  description = "Cloud Run service account email"
  value       = google_service_account.cloud_run.email
}

# Estimated monthly cost breakdown
output "estimated_monthly_cost" {
  description = "Rough estimated monthly GCP cost"
  value       = <<-EOT
    Cloud SQL (db-g1-small, 20GB SSD):  ~$30/mo
    Memorystore Redis (1GB BASIC):      ~$35/mo
    Cloud Run App (scale-to-zero):      ~$5-15/mo (depends on traffic)
    Cloud Run Worker (always-on):       ~$20/mo
    Artifact Registry:                  ~$1/mo
    Cloud Storage:                      ~$1/mo
    VPC Connector:                      ~$7/mo
    Secret Manager:                     ~$0/mo (free tier)
    ─────────────────────────────────────────────
    TOTAL ESTIMATE:                     ~$100-110/mo
  EOT
}
