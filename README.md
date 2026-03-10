# Ignite

[![CI/CD](https://github.com/sarathfrancis90/ignite/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/sarathfrancis90/ignite/actions/workflows/ci-cd.yml)

Open-source innovation management platform for idea generation, evaluation, and implementation. A comprehensive alternative to HYPE Enterprise.

## Features

- **Campaign Management** - Create and manage innovation campaigns with rich wizard setup and lifecycle management
- **Idea Engine** - Submit, discuss, vote on, and evaluate ideas with community graduation
- **Evaluation Engine** - Scorecard and pairwise evaluation with weighted scoring and bubble charts
- **Partner Engagement** - Organization database, scouting boards, and use case pipelines
- **Strategy Building** - Trends, technologies, insights, and innovation portfolios
- **Project Management** - Phase-gate processes with activities, tasks, and gatekeeper decisions
- **AI-Powered** - Semantic similarity, idea enrichment, and smart summarization (optional)

## Tech Stack

| Layer       | Technology               |
| ----------- | ------------------------ |
| Framework   | Next.js 14 (App Router)  |
| Language    | TypeScript (strict mode) |
| API         | tRPC                     |
| Database    | PostgreSQL 15 + Prisma   |
| Cache/Queue | Redis + BullMQ           |
| Auth        | Auth.js v5               |
| UI          | Tailwind CSS + shadcn/ui |
| Real-time   | Socket.io                |
| AI          | pgvector + ONNX Runtime  |
| Testing     | Vitest + Playwright      |
| Deployment  | Docker + Cloud Run       |

## Quick Start

```bash
# Prerequisites: Node.js 20+, Docker

git clone https://github.com/sarathfrancis90/ignite.git
cd ignite
npm install
cp .env.example .env
docker compose up -d
npx prisma generate
npx prisma migrate dev
npm run dev
```

Open http://localhost:3000

## Documentation

- [Development Guide](DEVELOPMENT.md) - Local setup, commands, project structure
- [Deployment Guide](DEPLOYMENT.md) - GCP infrastructure, CI/CD pipeline, operations

## Contributing

Please follow the guidelines in [CLAUDE.md](CLAUDE.md).

## License

AGPLv3
