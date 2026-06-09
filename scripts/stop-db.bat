@echo off
set PGDATA=%USERPROFILE%\pgsql\pgsql\data

echo Stopping PostgreSQL...
pg_ctl -D "%PGDATA%" stop
echo Done.