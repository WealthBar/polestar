#!/bin/bash
echo "creating users"

echo "dropping db"
echo "drop database ${DB_HELLO_NAME} WITH (FORCE);" | psql -X -e -d ${DB_HELLO_SUPER_URL}
echo "dropping test db"
echo "drop database ${DB_HELLO_NAME}_test WITH (FORCE);" | psql -X -e -d ${DB_HELLO_SUPER_URL}

echo $(cat << HERE
DROP USER IF EXISTS ${DB_HELLO_NAME}_dba;
DROP USER IF EXISTS ${DB_HELLO_NAME}_client;
DROP USER IF EXISTS ${DB_HELLO_NAME}_ro_client;
DROP USER IF EXISTS ${DB_HELLO_NAME}_staff;
DROP USER IF EXISTS ${DB_HELLO_NAME}_ro_staff;
HERE
) | psql -X -e -d ${DB_HELLO_SUPER_URL} --echo-all -f -


echo "creating db"
echo "create database ${DB_HELLO_NAME};" | psql -X -e -d ${DB_HELLO_SUPER_URL}
echo "creating test db"
echo "create database ${DB_HELLO_NAME}_test;" | psql -X -e -d ${DB_HELLO_SUPER_URL}

USER_SQL=$(cat << HERE
CREATE USER ${DB_HELLO_NAME}_dba SUPERUSER PASSWORD '${DB_HELLO_DBA_PASSWORD}';
CREATE USER ${DB_HELLO_NAME}_client PASSWORD '${DB_HELLO_CLIENT_PASSWORD}';
CREATE USER ${DB_HELLO_NAME}_ro_client PASSWORD '${DB_HELLO_RO_CLIENT_PASSWORD}';
CREATE USER ${DB_HELLO_NAME}_staff PASSWORD '${DB_HELLO_STAFF_PASSWORD}';
CREATE USER ${DB_HELLO_NAME}_ro_staff PASSWORD '${DB_HELLO_RO_STAFF_PASSWORD}';

grant connect on database ${DB_HELLO_NAME} to ${DB_HELLO_NAME}_dba;
grant connect on database ${DB_HELLO_NAME} to ${DB_HELLO_NAME}_client;
grant connect on database ${DB_HELLO_NAME} to ${DB_HELLO_NAME}_ro_client;
grant connect on database ${DB_HELLO_NAME} to ${DB_HELLO_NAME}_staff;
grant connect on database ${DB_HELLO_NAME} to ${DB_HELLO_NAME}_ro_staff;
HERE
)
echo $USER_SQL | psql -X -e -d ${DB_HELLO_SUPER_URL} -f -

SETUP_SQL=$(cat << HERE
DROP SCHEMA public;
CREATE SCHEMA IF NOT EXISTS func;

SET SEARCH_PATH = func;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gin;
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS hstore;

CREATE SCHEMA IF NOT EXISTS meta;
CREATE SCHEMA IF NOT EXISTS client;
CREATE SCHEMA IF NOT EXISTS staff;

grant all on schema meta TO ${DB_HELLO_NAME}_dba;
grant all on schema func TO ${DB_HELLO_NAME}_dba;
grant all on schema client TO ${DB_HELLO_NAME}_dba;
grant all on schema staff TO ${DB_HELLO_NAME}_dba;

grant usage on schema meta,func,client,staff to ${DB_HELLO_NAME}_staff;
grant usage on schema meta,func,client,staff to ${DB_HELLO_NAME}_ro_staff;
grant usage on schema meta,func,client to ${DB_HELLO_NAME}_client;
grant usage on schema meta,func,client to ${DB_HELLO_NAME}_ro_client;

alter default privileges for user ${DB_HELLO_NAME}_dba in schema meta grant all on tables to ${DB_HELLO_NAME}_dba;
alter default privileges for user ${DB_HELLO_NAME}_dba in schema meta grant all on functions to ${DB_HELLO_NAME}_dba;
alter default privileges for user ${DB_HELLO_NAME}_dba in schema meta grant all on routines to ${DB_HELLO_NAME}_dba;

alter default privileges for user ${DB_HELLO_NAME}_dba in schema func grant all on functions to ${DB_HELLO_NAME}_dba;
alter default privileges for user ${DB_HELLO_NAME}_dba in schema func grant all on routines to ${DB_HELLO_NAME}_dba;

alter default privileges for user ${DB_HELLO_NAME}_dba in schema func grant execute on functions to ${DB_HELLO_NAME}_client;
alter default privileges for user ${DB_HELLO_NAME}_dba in schema func grant execute on functions to ${DB_HELLO_NAME}_ro_client;
alter default privileges for user ${DB_HELLO_NAME}_dba in schema func grant execute on routines to ${DB_HELLO_NAME}_client;
alter default privileges for user ${DB_HELLO_NAME}_dba in schema func grant execute on routines to ${DB_HELLO_NAME}_ro_client;

alter default privileges for user ${DB_HELLO_NAME}_dba in schema func grant execute on functions to ${DB_HELLO_NAME}_staff;
alter default privileges for user ${DB_HELLO_NAME}_dba in schema func grant execute on functions to ${DB_HELLO_NAME}_ro_staff;
alter default privileges for user ${DB_HELLO_NAME}_dba in schema func grant execute on routines to ${DB_HELLO_NAME}_staff;
alter default privileges for user ${DB_HELLO_NAME}_dba in schema func grant execute on routines to ${DB_HELLO_NAME}_ro_staff;

alter default privileges for user ${DB_HELLO_NAME}_dba in schema client grant all on tables to ${DB_HELLO_NAME}_dba;
alter default privileges for user ${DB_HELLO_NAME}_dba in schema client grant all on tables to ${DB_HELLO_NAME}_client;
alter default privileges for user ${DB_HELLO_NAME}_dba in schema client grant all on tables to ${DB_HELLO_NAME}_staff;
alter default privileges for user ${DB_HELLO_NAME}_dba in schema client grant select on tables to ${DB_HELLO_NAME}_ro_client;
alter default privileges for user ${DB_HELLO_NAME}_dba in schema client grant select on tables to ${DB_HELLO_NAME}_ro_staff;

alter default privileges for user ${DB_HELLO_NAME}_dba in schema staff grant all on tables to ${DB_HELLO_NAME}_dba;
alter default privileges for user ${DB_HELLO_NAME}_dba in schema staff grant all on tables to ${DB_HELLO_NAME}_staff;
alter default privileges for user ${DB_HELLO_NAME}_dba in schema staff grant select on tables to ${DB_HELLO_NAME}_ro_staff;

ALTER ROLE ${DB_HELLO_NAME}_dba SET search_path = staff, client, func;
ALTER ROLE ${DB_HELLO_NAME}_staff SET search_path = staff, client, func;
ALTER ROLE ${DB_HELLO_NAME}_ro_staff SET search_path = staff, client, func;
ALTER ROLE ${DB_HELLO_NAME}_client SET search_path = client, func;
ALTER ROLE ${DB_HELLO_NAME}_ro_client SET search_path = client, func;

HERE
)

echo $SETUP_SQL | psql -X -e -d ${DB_HELLO_SUPER_URL}${DB_HELLO_NAME} -f -
echo $SETUP_SQL | psql -X -e -d ${DB_HELLO_SUPER_URL}${DB_HELLO_NAME}_test -f -

echo "seed ${DB_HELLO_DBA_URL} [DEV]"
psql -X -e -d ${DB_HELLO_DBA_URL} --echo-all -f ./schema/schema.sql | grep ERROR

echo "seed ${DB_HELLO_DBA_URL} [TEST]"
psql -X -e -d ${DB_HELLO_DBA_URL_TEST} --echo-all -f ./schema/schema.sql | grep ERROR
