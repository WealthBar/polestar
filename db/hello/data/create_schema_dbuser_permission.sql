CREATE SCHEMA IF NOT EXISTS func;

-- load extensions into func
SET SEARCH_PATH = func;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gin;
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS hstore;

CREATE SCHEMA IF NOT EXISTS meta;
CREATE SCHEMA IF NOT EXISTS client;
CREATE SCHEMA IF NOT EXISTS staff;

-- udba has all priv's for all our schemas
grant all on schema meta TO udba;
grant all on schema func TO udba;
grant all on schema client TO udba;
grant all on schema staff TO udba;

-- usage by role
grant usage on schema meta,func,client,staff to ustaff;
grant usage on schema meta,func,client to uclient;

-- the "for user udba" is the user executing the command that creates the object (table, function, etc.)
-- since udba is used for all migrations it will be the user creating things.
alter default privileges for user udba in schema meta grant all on tables to udba;
alter default privileges for user udba in schema meta grant all on functions to udba;
alter default privileges for user udba in schema meta grant all on routines to udba;

alter default privileges for user udba in schema func grant all on functions to udba;
alter default privileges for user udba in schema func grant all on routines to udba;

alter default privileges for user udba in schema func grant execute on functions to uclient;
alter default privileges for user udba in schema func grant execute on routines to uclient;

alter default privileges for user udba in schema func grant execute on functions to ustaff;
alter default privileges for user udba in schema func grant execute on routines to ustaff;

alter default privileges for user udba in schema client grant all on tables to udba;
alter default privileges for user udba in schema client grant all on tables to uclient;
alter default privileges for user udba in schema client grant all on tables to ustaff;
alter default privileges for user udba in schema client grant execute on functions to udba;
alter default privileges for user udba in schema client grant execute on functions to uclient;
alter default privileges for user udba in schema client grant execute on routines to ustaff;

alter default privileges for user udba in schema staff grant all on tables to udba;
alter default privileges for user udba in schema staff grant all on tables to ustaff;
alter default privileges for user udba in schema staff grant execute on functions to udba;
alter default privileges for user udba in schema staff grant execute on routines to ustaff;

-- setup default search paths for users
ALTER ROLE udba SET search_path = staff, client, func;
ALTER ROLE ustaff SET search_path = staff, client, func;
ALTER ROLE uclient SET search_path = client, func;
