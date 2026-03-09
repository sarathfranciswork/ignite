# Commit and Push Workflow

1. Run typecheck (if applicable): `npx tsc --noEmit`
2. Run lint (if applicable): `npx eslint .`
3. Run unit tests (detect runner automatically)
4. Run build (if applicable): `npm run build`
5. Stage changes: `git add -A`
6. Commit: `git commit -m "feat: <description>"`
7. Push: `git push origin main`

Commit message prefixes:

- feat: new feature
- fix: bug fix
- refactor: code restructure
- test: adding tests
- chore: maintenance, config changes
- docs: documentation updates
