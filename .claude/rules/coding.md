# Coding Rules

- TypeScript strict mode when applicable — no `any`, no `as any`, no `@ts-ignore`
- Named exports preferred (except page-level defaults)
- One concern per file — max 300 lines
- All props/params must be typed
- No hardcoded URLs or secrets — use environment variables
- No `console.log` in production code — use a structured logger
- No unused imports or variables
- Handle errors explicitly — never swallow errors silently
- Validate all external input (user input, API responses)
- Write tests for new features
