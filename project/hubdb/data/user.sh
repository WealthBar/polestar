#!/bin/bash
SQL=$(cat <<HERE
CREATE USER udba SUPERUSER PASSWORD '${DB_DBA_PASSWORD}';
CREATE USER uclient PASSWORD '${DB_CLIENT_PASSWORD}';
CREATE USER ustaff PASSWORD '${DB_STAFF_PASSWORD}';
HERE
)

echo "${SQL}"
