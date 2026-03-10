#!/bin/sh
set -e

echo "=== Ignite Startup ==="
echo "Environment: ${NODE_ENV:-development}"

# Run Prisma migrations (only in production, and only for the app container)
if [ "$NODE_ENV" = "production" ] && [ "$SKIP_MIGRATIONS" != "true" ]; then
  echo "Running database migrations..."
  node ./node_modules/prisma/build/index.js migrate deploy 2>&1
  echo "Migrations completed successfully."
fi

echo "Starting application..."
exec "$@"
