terraform {
  required_version = ">= 1.5"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }

  # Store state in GCS bucket (create manually first)
  # gcloud storage buckets create gs://${PROJECT_ID}-terraform-state --location=us-central1
  backend "gcs" {
    # bucket is set via -backend-config during init
    prefix = "terraform/state"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

# Enable required GCP APIs
resource "google_project_service" "apis" {
  for_each = toset([
    "run.googleapis.com",
    "sqladmin.googleapis.com",
    "redis.googleapis.com",
    "secretmanager.googleapis.com",
    "artifactregistry.googleapis.com",
    "compute.googleapis.com",
    "vpcaccess.googleapis.com",
    "servicenetworking.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "iam.googleapis.com",
  ])

  service            = each.value
  disable_on_destroy = false
}

# Random suffix for unique resource names
resource "random_id" "suffix" {
  byte_length = 4
}

# Generate database password
resource "random_password" "db_password" {
  length  = 32
  special = false
}

# Generate NextAuth secret
resource "random_password" "nextauth_secret" {
  length  = 64
  special = false
}

# ============================================================
# NETWORKING
# ============================================================

# VPC for private connectivity (Cloud SQL + Redis)
resource "google_compute_network" "vpc" {
  name                    = "ignite-vpc"
  auto_create_subnetworks = false

  depends_on = [google_project_service.apis["compute.googleapis.com"]]
}

resource "google_compute_subnetwork" "subnet" {
  name          = "ignite-subnet"
  ip_cidr_range = "10.0.0.0/24"
  region        = var.region
  network       = google_compute_network.vpc.id
}

# Private IP range for Cloud SQL
resource "google_compute_global_address" "private_ip" {
  name          = "ignite-private-ip"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.vpc.id
}

resource "google_service_networking_connection" "private_vpc" {
  network                 = google_compute_network.vpc.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip.name]

  depends_on = [google_project_service.apis["servicenetworking.googleapis.com"]]
}

# Serverless VPC connector (Cloud Run -> Cloud SQL/Redis)
resource "google_vpc_access_connector" "connector" {
  name          = "ignite-connector"
  region        = var.region
  ip_cidr_range = "10.8.0.0/28"
  network       = google_compute_network.vpc.name
  min_instances = 2
  max_instances = 3

  depends_on = [google_project_service.apis["vpcaccess.googleapis.com"]]
}

# ============================================================
# CLOUD SQL (PostgreSQL 15 + pgvector)
# ============================================================

resource "google_sql_database_instance" "postgres" {
  name             = "ignite-db-${random_id.suffix.hex}"
  database_version = "POSTGRES_15"
  region           = var.region

  settings {
    tier              = var.db_tier
    availability_type = "ZONAL"
    disk_size         = 20
    disk_type         = "PD_SSD"
    disk_autoresize   = true

    ip_configuration {
      ipv4_enabled                                  = false
      private_network                               = google_compute_network.vpc.id
      enable_private_path_for_google_cloud_services = true
    }

    database_flags {
      name  = "cloudsql.enable_pgvector"
      value = "on"
    }

    database_flags {
      name  = "max_connections"
      value = "100"
    }

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
      start_time                     = "03:00"
      transaction_log_retention_days = 7

      backup_retention_settings {
        retained_backups = 7
      }
    }

    maintenance_window {
      day          = 7  # Sunday
      hour         = 4  # 4 AM
      update_track = "stable"
    }

    insights_config {
      query_insights_enabled  = true
      query_plans_per_minute  = 5
      query_string_length     = 1024
      record_application_tags = true
      record_client_address   = false
    }
  }

  deletion_protection = true

  depends_on = [
    google_service_networking_connection.private_vpc,
    google_project_service.apis["sqladmin.googleapis.com"],
  ]
}

resource "google_sql_database" "ignite" {
  name     = var.db_name
  instance = google_sql_database_instance.postgres.name
}

resource "google_sql_user" "ignite" {
  name     = var.db_user
  instance = google_sql_database_instance.postgres.name
  password = random_password.db_password.result
}

# ============================================================
# MEMORYSTORE (Redis)
# ============================================================

resource "google_redis_instance" "redis" {
  name           = "ignite-redis"
  tier           = var.redis_tier
  memory_size_gb = var.redis_memory_size_gb
  region         = var.region

  redis_version      = "REDIS_7_2"
  authorized_network = google_compute_network.vpc.id
  connect_mode       = "PRIVATE_SERVICE_ACCESS"

  redis_configs = {
    maxmemory-policy = "allkeys-lru"
  }

  depends_on = [
    google_service_networking_connection.private_vpc,
    google_project_service.apis["redis.googleapis.com"],
  ]
}

# ============================================================
# ARTIFACT REGISTRY (Docker images)
# ============================================================

resource "google_artifact_registry_repository" "docker" {
  location      = var.region
  repository_id = "ignite"
  format        = "DOCKER"
  description   = "Docker images for Ignite platform"

  cleanup_policies {
    id     = "keep-recent"
    action = "KEEP"
    most_recent_versions {
      keep_count = 10
    }
  }

  depends_on = [google_project_service.apis["artifactregistry.googleapis.com"]]
}

# ============================================================
# CLOUD STORAGE (File uploads)
# ============================================================

resource "google_storage_bucket" "uploads" {
  name     = "${var.project_id}-ignite-uploads"
  location = var.region

  uniform_bucket_level_access = true
  force_destroy               = false

  cors {
    origin          = ["*"]  # Tighten in production with actual domain
    method          = ["GET", "PUT", "POST"]
    response_header = ["Content-Type", "Content-Disposition"]
    max_age_seconds = 3600
  }

  lifecycle_rule {
    condition {
      age = 365
    }
    action {
      type = "SetStorageClass"
      storage_class = "NEARLINE"
    }
  }
}

# ============================================================
# SECRET MANAGER
# ============================================================

locals {
  secrets = {
    "database-url" = "postgresql://${var.db_user}:${random_password.db_password.result}@${google_sql_database_instance.postgres.private_ip_address}:5432/${var.db_name}?schema=public"
    "redis-url"    = "redis://${google_redis_instance.redis.host}:${google_redis_instance.redis.port}"
    "nextauth-secret" = random_password.nextauth_secret.result
  }
}

resource "google_secret_manager_secret" "secrets" {
  for_each  = local.secrets
  secret_id = "ignite-${each.key}"

  replication {
    auto {}
  }

  depends_on = [google_project_service.apis["secretmanager.googleapis.com"]]
}

resource "google_secret_manager_secret_version" "secrets" {
  for_each    = local.secrets
  secret      = google_secret_manager_secret.secrets[each.key].id
  secret_data = each.value
}

# Placeholder secrets (user must populate manually)
resource "google_secret_manager_secret" "manual_secrets" {
  for_each = toset([
    "ignite-smtp-host",
    "ignite-smtp-port",
    "ignite-smtp-user",
    "ignite-smtp-pass",
  ])

  secret_id = each.value

  replication {
    auto {}
  }

  depends_on = [google_project_service.apis["secretmanager.googleapis.com"]]
}

# ============================================================
# SERVICE ACCOUNT (for Cloud Run)
# ============================================================

resource "google_service_account" "cloud_run" {
  account_id   = "ignite-cloud-run"
  display_name = "Ignite Cloud Run Service Account"
}

# Cloud Run SA can access secrets
resource "google_secret_manager_secret_iam_member" "cloud_run_secrets" {
  for_each  = google_secret_manager_secret.secrets
  secret_id = each.value.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cloud_run.email}"
}

# Cloud Run SA can access Cloud SQL
resource "google_project_iam_member" "cloud_run_sql" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.cloud_run.email}"
}

# Cloud Run SA can access Cloud Storage
resource "google_storage_bucket_iam_member" "cloud_run_storage" {
  bucket = google_storage_bucket.uploads.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.cloud_run.email}"
}

# ============================================================
# CLOUD RUN (App + Worker)
# ============================================================

resource "google_cloud_run_v2_service" "app" {
  name     = "ignite-app"
  location = var.region

  template {
    service_account = google_service_account.cloud_run.email

    scaling {
      min_instance_count = var.cloud_run_min_instances
      max_instance_count = var.cloud_run_max_instances
    }

    vpc_access {
      connector = google_vpc_access_connector.connector.id
      egress    = "PRIVATE_RANGES_ONLY"
    }

    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/ignite/app:latest"

      ports {
        container_port = 3000
      }

      resources {
        limits = {
          cpu    = var.cloud_run_cpu
          memory = var.cloud_run_memory
        }
        cpu_idle          = true
        startup_cpu_boost = true
      }

      startup_probe {
        http_get {
          path = "/api/health"
          port = 3000
        }
        initial_delay_seconds = 10
        period_seconds        = 5
        failure_threshold     = 10
        timeout_seconds       = 3
      }

      liveness_probe {
        http_get {
          path = "/api/health"
          port = 3000
        }
        period_seconds    = 30
        failure_threshold = 3
        timeout_seconds   = 3
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name  = "NEXTAUTH_URL"
        value = var.domain != "" ? "https://${var.domain}" : ""
      }
      env {
        name  = "GCS_BUCKET"
        value = google_storage_bucket.uploads.name
      }
      env {
        name  = "GCP_PROJECT_ID"
        value = var.project_id
      }
      env {
        name  = "AI_ENABLED"
        value = "false"
      }

      # Secrets from Secret Manager
      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secrets["database-url"].secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "REDIS_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secrets["redis-url"].secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "NEXTAUTH_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secrets["nextauth-secret"].secret_id
            version = "latest"
          }
        }
      }
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  depends_on = [
    google_project_service.apis["run.googleapis.com"],
    google_secret_manager_secret_version.secrets,
  ]

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,  # Image updated by CI/CD
    ]
  }
}

# Worker service (no external traffic)
resource "google_cloud_run_v2_service" "worker" {
  name     = "ignite-worker"
  location = var.region

  template {
    service_account = google_service_account.cloud_run.email

    scaling {
      min_instance_count = 1
      max_instance_count = 2
    }

    vpc_access {
      connector = google_vpc_access_connector.connector.id
      egress    = "PRIVATE_RANGES_ONLY"
    }

    containers {
      image   = "${var.region}-docker.pkg.dev/${var.project_id}/ignite/worker:latest"
      command = ["node", "dist/worker.js"]

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
        cpu_idle = false  # Worker needs always-on CPU
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name  = "GCS_BUCKET"
        value = google_storage_bucket.uploads.name
      }
      env {
        name  = "GCP_PROJECT_ID"
        value = var.project_id
      }
      env {
        name  = "AI_ENABLED"
        value = "false"
      }

      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secrets["database-url"].secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "REDIS_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secrets["redis-url"].secret_id
            version = "latest"
          }
        }
      }
    }
  }

  depends_on = [
    google_project_service.apis["run.googleapis.com"],
    google_secret_manager_secret_version.secrets,
  ]

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
    ]
  }
}

# Allow unauthenticated access to the app (public website)
resource "google_cloud_run_v2_service_iam_member" "public" {
  name     = google_cloud_run_v2_service.app.name
  location = var.region
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# ============================================================
# CI/CD SERVICE ACCOUNT (for GitHub Actions)
# ============================================================

resource "google_service_account" "github_actions" {
  account_id   = "ignite-github-actions"
  display_name = "Ignite GitHub Actions CI/CD"
}

# GitHub Actions SA can push to Artifact Registry
resource "google_artifact_registry_repository_iam_member" "github_push" {
  location   = var.region
  repository = google_artifact_registry_repository.docker.name
  role       = "roles/artifactregistry.writer"
  member     = "serviceAccount:${google_service_account.github_actions.email}"
}

# GitHub Actions SA can deploy to Cloud Run
resource "google_project_iam_member" "github_run_admin" {
  project = var.project_id
  role    = "roles/run.admin"
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}

# GitHub Actions SA can act as the Cloud Run service account
resource "google_service_account_iam_member" "github_act_as" {
  service_account_id = google_service_account.cloud_run.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.github_actions.email}"
}

# Workload Identity Federation for GitHub Actions (keyless auth)
resource "google_iam_workload_identity_pool" "github" {
  workload_identity_pool_id = "github-pool"
  display_name              = "GitHub Actions Pool"

  depends_on = [google_project_service.apis["iam.googleapis.com"]]
}

resource "google_iam_workload_identity_pool_provider" "github" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-provider"
  display_name                       = "GitHub Actions Provider"

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.actor"      = "assertion.actor"
    "attribute.repository" = "assertion.repository"
  }

  attribute_condition = "assertion.repository == 'sarathfrancis90/ignite'"

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

resource "google_service_account_iam_member" "github_wif" {
  service_account_id = google_service_account.github_actions.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/sarathfrancis90/ignite"
}
