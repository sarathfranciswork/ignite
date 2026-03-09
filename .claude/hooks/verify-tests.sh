#!/bin/bash
# Pre-stop verification: ensure quality before ending session
set -e
echo "Running pre-stop verification..."

# 1. TypeScript (if applicable)
if [ -f "tsconfig.json" ]; then
  echo "  TypeScript check..."
  npx tsc --noEmit 2>/dev/null || { echo "TypeScript errors found!"; exit 1; }
fi

# 2. Lint (if applicable)
if [ -f ".eslintrc.js" ] || [ -f ".eslintrc.json" ] || [ -f "eslint.config.js" ] || [ -f "eslint.config.mjs" ]; then
  echo "  Lint check..."
  npx eslint . --max-warnings=0 2>/dev/null || { echo "Lint errors found!"; exit 1; }
fi

# 3. Unit tests (detect test runner)
if grep -q '"vitest"' package.json 2>/dev/null; then
  echo "  Unit tests (vitest)..."
  npx vitest run --reporter=dot 2>/dev/null || { echo "Unit tests failed!"; exit 1; }
elif grep -q '"jest"' package.json 2>/dev/null; then
  echo "  Unit tests (jest)..."
  npx jest --ci 2>/dev/null || { echo "Unit tests failed!"; exit 1; }
elif [ -f "pytest.ini" ] || [ -f "pyproject.toml" ]; then
  echo "  Unit tests (pytest)..."
  python3 -m pytest --tb=short 2>/dev/null || { echo "Unit tests failed!"; exit 1; }
fi

# 4. Build (if applicable)
if grep -q '"build"' package.json 2>/dev/null; then
  echo "  Build check..."
  npm run build 2>/dev/null || { echo "Build failed!"; exit 1; }
fi

# 5. Uncommitted changes
if [[ -n $(git status --porcelain) ]]; then
  echo "Uncommitted changes detected. Commit and push before ending."
  exit 1
fi

# 6. Unpushed commits
UNPUSHED=$(git log --oneline origin/main..HEAD 2>/dev/null | wc -l)
if [[ "$UNPUSHED" -gt 0 ]]; then
  echo "$UNPUSHED unpushed commit(s). Push before ending."
  exit 1
fi

echo "All checks passed. Safe to end session."
