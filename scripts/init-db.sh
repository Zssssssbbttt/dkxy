#!/bin/sh
# scripts/init-db.sh

echo "Running database push..."
npx drizzle-kit push

echo "Database initialization completed!"