# Ignite Innovation Management Platform

## About This Repo

This is a T3 Stack application (Next.js 14+ App Router, tRPC, Prisma, Auth.js v5, Tailwind CSS, shadcn/ui).
It is an enterprise innovation management platform.

## Architecture Rules

- TypeScript strict mode — no `any`, no `as any`, no `@ts-ignore`
- tRPC routers are thin dispatch — validate input, check permissions, call service, return result
- Services contain ALL business logic — no business logic in routers or components
- Status changes ONLY through state machine transition functions — never direct prisma.update({ status })
- Events via EventBus — services emit events, listeners handle cross-cutting concerns
- RBAC via middleware — every tRPC procedure checks permissions
- AI features are optional — platform must function fully without them
- The logger uses pino. API: `logger.info({data}, "message")` — object FIRST, message string SECOND

## Key Files to Read First

- `CLAUDE.md` — coding standards and conventions
- `_bmad-output/project-context.md` — 127 rules for AI agent consistency
- `_bmad-output/planning-artifacts/architecture.md` — full architecture decisions

## Development Workflow

1. Create a feature branch: `qwen/issue-<number>-<slug>`
2. Read the issue description for acceptance criteria
3. Implement following architecture patterns
4. Run: `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`
5. Fix ALL errors before committing
6. Commit with conventional commits: `feat(scope):`, `fix(scope):`, etc.
7. Rebase on latest main before pushing
8. Create PR with `Closes #<issue-number>` in the body — THIS IS CRITICAL

## Conflict Resolution

- `package-lock.json`: `git checkout --theirs package-lock.json && npm install`
- `prisma/schema.prisma`: Keep ALL models from both sides, then `npx prisma validate && npx prisma format`
- `package.json`: Keep all deps from both sides, use HIGHER version for conflicts
- Files you created that don't exist in main: Keep yours

## Rules

- NEVER recreate project scaffolding if it already exists
- NEVER modify CLAUDE.md, settings.json, or lock files
- NEVER hardcode secrets or API URLs
- NEVER commit .env files
- Write tests for new features
- One logical change per commit
- Named exports preferred (except page-level defaults)
- One concern per file — max 300 lines
- Handle errors explicitly — never swallow errors silently
