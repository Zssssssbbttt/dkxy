#!/bin/sh
# scripts/init-db.sh

echo "Running database migrations..."
npx prisma migrate deploy

echo "Seeding database..."
npx prisma db seed

echo "Database initialization completed!"