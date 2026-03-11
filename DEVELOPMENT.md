# Development Guide

## Prerequisites

- Node.js 20+
- Docker & Docker Compose
- Git

## Quick Start

```bash
# Clone the repository
git clone https://github.com/sarathfranciswork/ignite.git
cd ignite

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start infrastructure (PostgreSQL, Redis, MinIO, Mailpit)
docker compose up -d

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

Open http://localhost:3000

## Available Services

| Service       | URL                   | Purpose             |
| ------------- | --------------------- | ------------------- |
| App           | http://localhost:3000 | Next.js application |
| PostgreSQL    | localhost:5432        | Database            |
| Redis         | localhost:6379        | Cache & queues      |
| MinIO Console | http://localhost:9001 | File storage UI     |
| MinIO S3 API  | http://localhost:9000 | S3-compatible API   |
| Mailpit       | http://localhost:8025 | Email testing UI    |

## Development Commands

```bash
# Development server (with Turbopack)
npm run dev

# Type checking
npm run typecheck

# Linting
npm run lint
npm run lint:fix

# Formatting
npm run format:check
npm run format

# Unit tests
npm run test
npm run test:watch
npm run test:coverage

# E2E tests (requires running app)
npm run test:e2e

# Visual regression tests
npm run test:visual
npm run test:visual:update  # Update baselines

# Database
npm run db:migrate          # Create migration
npm run db:push             # Push schema (no migration)
npm run db:studio           # Prisma Studio GUI
npm run db:generate         # Regenerate client

# Docker
npm run docker:up           # Start infra only
npm run docker:down         # Stop all
npm run docker:full         # Start infra + worker
```

## Project Structure

```
ignite/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Auth pages (login, register)
│   │   ├── (platform)/         # Protected platform pages
│   │   │   ├── dashboard/
│   │   │   ├── campaigns/
│   │   │   ├── channels/
│   │   │   ├── ideas/
│   │   │   ├── explore/
│   │   │   ├── strategy/
│   │   │   ├── partners/
│   │   │   ├── projects/
│   │   │   ├── reports/
│   │   │   ├── admin/
│   │   │   └── profile/
│   │   └── api/                # API routes
│   │       ├── health/         # Health check
│   │       ├── metrics/        # Prometheus metrics
│   │       └── trpc/           # tRPC handler
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── layout/             # Shell, Sidebar, Header
│   │   └── shared/             # Reusable components
│   ├── lib/                    # Client utilities
│   └── server/                 # Server-only code
│       ├── lib/                # Prisma, Redis, Auth, etc.
│       ├── services/           # Business logic
│       ├── events/             # Event bus + listeners
│       ├── jobs/               # BullMQ workers
│       └── ai/                 # AI providers
├── prisma/                     # Database schema & migrations
├── tests/
│   ├── e2e/                    # Playwright E2E tests
│   └── visual/                 # Visual regression tests
├── terraform/                  # GCP infrastructure
├── docker/                     # Docker support files
└── .github/                    # CI/CD + Claude orchestration
```

## Switching Between Local and GCP

The app uses environment variables for all external services. The same code runs locally (Docker Compose) and in GCP (Cloud Run):

| Service  | Local             | GCP            |
| -------- | ----------------- | -------------- |
| Database | Docker PostgreSQL | Cloud SQL      |
| Redis    | Docker Redis      | Memorystore    |
| Storage  | Docker MinIO      | Cloud Storage  |
| Email    | Docker Mailpit    | SMTP provider  |
| Secrets  | `.env` file       | Secret Manager |

No GCP-specific code is needed for local development. The Docker Compose setup is fully self-contained.
