# Ignite

> Project description goes here. Update this file once the project scope is defined.

## Tech Stack

| Layer | Technology | Purpose |
| ----- | ---------- | ------- |
| TBD   | TBD        | TBD     |

## Directory Structure

```
ignite/
├── CLAUDE.md          <- You are here
├── .claude/           <- Claude Code configuration
│   ├── settings.json  <- Hooks, plugins, model config
│   ├── hooks/         <- Pre/post tool hooks
│   ├── commands/      <- Slash commands (/commit-push, /run-tests)
│   ├── rules/         <- Coding rules (auto-loaded by Claude)
│   └── skills/        <- Skills (ui-ux-pro-max)
├── .mcp.json          <- MCP server config (playwright, fetch, context7)
└── src/               <- Source code (TBD)
```

## Session Protocol

### On Session Start

1. `git pull origin main`
2. Read relevant docs for current task
3. Check for any open issues or TODOs

### Development Loop

1. Read requirements
2. Implement code
3. Write tests
4. Run typecheck + lint + tests
5. Commit and push

### On Session End

1. Run full test suite
2. Commit any remaining work
3. Push to remote

## Commit Convention

```
feat(scope): description
fix(scope): description
refactor(scope): description
test(scope): description
chore: description
docs: description
```

## NEVER DO

- Never commit without running tests first
- Never use `any` type in TypeScript
- Never hardcode secrets or API URLs
- Never commit `.env` files
- Never modify `CLAUDE.md`, `settings.json`, or lock files without explicit instruction
