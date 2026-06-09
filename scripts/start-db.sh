#!/bin/sh
# 手动启动 PostgreSQL（不注册 Windows 服务）
# 每次启动项目前运行此脚本

PGDATA="${PGDATA:-$HOME/pgsql/pgsql/data}"
PGLOG="$HOME/pgsql/pgsql/logfile"

echo "Starting PostgreSQL..."
pg_ctl -D "$PGDATA" -l "$PGLOG" start

echo "PostgreSQL started. Run 'npm run db:stop' to stop."