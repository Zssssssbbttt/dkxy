#!/bin/sh
# 停止 PostgreSQL

PGDATA="${PGDATA:-$HOME/pgsql/pgsql/data}"

echo "Stopping PostgreSQL..."
pg_ctl -D "$PGDATA" stop

echo "PostgreSQL stopped."