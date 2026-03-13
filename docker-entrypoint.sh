#!/bin/sh
set -e

echo "=== Ignite Startup ==="
echo "Environment: ${NODE_ENV:-development}"

# Run Prisma migrations (only in production, and only for the app container)
if [ "$NODE_ENV" = "production" ] && [ "$SKIP_MIGRATIONS" != "true" ]; then
  echo "Running database migrations..."
  if node ./node_modules/prisma/build/index.js migrate deploy 2>&1; then
    echo "Migrations completed successfully."
  else
    echo "WARNING: Migration failed (exit code $?). The app will start anyway."
    echo "Check the migration state with: prisma migrate status"
    echo "To resolve: prisma migrate resolve --rolled-back <migration_name>"
  fi
fi

echo "Starting application..."
exec "$@"
