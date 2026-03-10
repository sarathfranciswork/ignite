#!/bin/sh
set -e

echo "=== Ignite Startup ==="
echo "Environment: ${NODE_ENV:-development}"
echo "Running migrations..."

# Run Prisma migrations (only in production, and only for the app container)
if [ "$NODE_ENV" = "production" ] && [ "$SKIP_MIGRATIONS" != "true" ]; then
  npx prisma migrate deploy 2>&1 || {
    echo "WARNING: Migration failed. App will start anyway."
    echo "Check database connectivity and migration status."
  }
fi

echo "Starting application..."
exec "$@"
