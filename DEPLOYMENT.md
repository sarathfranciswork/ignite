# Deployment Guide

## Architecture Overview

```
GitHub (push to main)
    |
    v
GitHub Actions CI/CD
    |
    ├── Stage 1: Quality (typecheck, lint, format)
    ├── Stage 2: Tests (vitest + PostgreSQL + Redis)
    ├── Stage 3: Build (Next.js + Docker image)
    ├── Stage 4: E2E Tests (Playwright)
    ├── Stage 5: Visual Regression
    ├── Stage 6: Deploy (Cloud Run)
    └── Stage 7: Post-Deploy Validation
```

## GCP Resources

| Resource  | Service                               | Estimated Cost   |
| --------- | ------------------------------------- | ---------------- |
| App       | Cloud Run (auto-scaling)              | ~$5-15/mo        |
| Worker    | Cloud Run (always-on)                 | ~$20/mo          |
| Database  | Cloud SQL PostgreSQL 15 (db-g1-small) | ~$30/mo          |
| Cache     | Memorystore Redis (1GB BASIC)         | ~$35/mo          |
| Storage   | Cloud Storage                         | ~$1/mo           |
| Registry  | Artifact Registry                     | ~$1/mo           |
| Network   | VPC Connector                         | ~$7/mo           |
| **Total** |                                       | **~$100-110/mo** |

## Prerequisites

1. GCP account with billing enabled
2. `gcloud` CLI installed and authenticated
3. `terraform` CLI installed (>= 1.5)
4. GitHub repository secrets configured

## Initial Setup (One-Time)

### 1. Create GCP Project

```bash
gcloud projects create ignite-XXXXXX --name="Ignite"
gcloud config set project ignite-XXXXXX
gcloud billing accounts list  # Find your billing account
gcloud billing projects link ignite-XXXXXX --billing-account=XXXXXX-XXXXXX-XXXXXX
```

### 2. Create Terraform State Bucket

```bash
gcloud storage buckets create gs://ignite-XXXXXX-terraform-state --location=us-central1
```

### 3. Provision Infrastructure

```bash
cd terraform

# Copy and fill in your values
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your project_id

terraform init -backend-config="bucket=ignite-XXXXXX-terraform-state"
terraform plan
terraform apply
```

### 4. Configure GitHub Secrets

After `terraform apply`, set these GitHub repository secrets:

```bash
# Get values from Terraform outputs
terraform output

# Set in GitHub (Settings > Secrets > Actions)
GCP_PROJECT_ID          # Your GCP project ID
GCP_WIF_PROVIDER        # From terraform output: github_wif_provider
GCP_SA_EMAIL            # From terraform output: github_sa_email
```

### 5. Push Initial Image

The first deployment needs a Docker image in Artifact Registry:

```bash
# Authenticate Docker
gcloud auth configure-docker us-central1-docker.pkg.dev

# Build and push
docker build -t us-central1-docker.pkg.dev/PROJECT_ID/ignite/app:latest .
docker push us-central1-docker.pkg.dev/PROJECT_ID/ignite/app:latest
```

After this, all subsequent deployments happen automatically via GitHub Actions.

## How Deployments Work

1. Developer merges PR to `main`
2. CI/CD pipeline runs Stages 1-5 (quality, tests, build, E2E, visual)
3. If all pass, Stage 6 deploys to Cloud Run with zero-downtime
4. Health check validates the new revision (`GET /api/health`)
5. If health check fails, automatic rollback to previous revision
6. Stage 7 runs smoke tests and visual regression against production

## Manual Operations

### Rollback

```bash
# List revisions
gcloud run revisions list --service ignite-app --region us-central1

# Route traffic to previous revision
gcloud run services update-traffic ignite-app \
  --region us-central1 \
  --to-revisions REVISION_NAME=100
```

### Database Migrations

Migrations run automatically on deployment. To run manually:

```bash
# Connect to Cloud SQL via proxy
gcloud sql connect INSTANCE_NAME --user=ignite --database=ignite

# Or use Prisma directly
DATABASE_URL="..." npx prisma migrate deploy
```

### View Logs

```bash
gcloud run services logs read ignite-app --region us-central1 --limit 100
```

## Environment Variables

All secrets are managed via GCP Secret Manager. To update:

```bash
echo -n "new-value" | gcloud secrets versions add ignite-database-url --data-file=-
```

The Cloud Run service automatically picks up new secret versions on next deployment.
