@echo off
set PGDATA=%USERPROFILE%\pgsql\pgsql\data
set PGLOG=%USERPROFILE%\pgsql\pgsql\logfile

echo Starting PostgreSQL...
pg_ctl -D "%PGDATA%" -l "%PGLOG%" start
echo Done.