# Run All Tests

```bash
echo "=== TypeScript Check ==="
npx tsc --noEmit 2>/dev/null || echo "No tsconfig.json found, skipping"

echo ""
echo "=== Lint ==="
npx eslint . 2>/dev/null || echo "No ESLint config found, skipping"

echo ""
echo "=== Unit Tests ==="
if grep -q '"vitest"' package.json 2>/dev/null; then
  npx vitest run
elif grep -q '"jest"' package.json 2>/dev/null; then
  npx jest
elif [ -f "pytest.ini" ] || [ -f "pyproject.toml" ]; then
  python3 -m pytest
else
  echo "No test runner detected, skipping"
fi

echo ""
echo "=== Build ==="
npm run build 2>/dev/null || echo "No build script found, skipping"

echo ""
echo "=== All Done ==="
```
