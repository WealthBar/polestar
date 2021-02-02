-- skip to APPSQL if you want to go past all the basic setup code.

-- some conventions:
-- tables are singular
-- id's are always prefixed by the table name (even in the table itself) to enable USING
-- a_1_b is an optional attribute table (one or zero b per a)
-- a_e_b is an extension table (exactly one b per a, PITA to handle case)
-- a_n_b is a detail table (many b per a)
-- a_x_b is an xref table (many b to many b)

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gin;
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS hstore;

CREATE SCHEMA meta;

CREATE FUNCTION raise_exception(what VARCHAR)
  RETURNS VOID AS $$
BEGIN
  RAISE EXCEPTION '%', what;
END
$$ LANGUAGE PLPGSQL;

-- version 2 of tuid_generate is just random
CREATE OR REPLACE FUNCTION tuid_generate()
  RETURNS UUID AS $$
DECLARE
  ct  BIGINT;
  r   BYTEA;
  r0  BIGINT;
  r1  BIGINT;
  r2  BIGINT;
  ax  BIGINT;
  bx  BIGINT;
  cx  BIGINT;
  dx  BIGINT;
  ret VARCHAR;
BEGIN
  r := gen_random_bytes(8); -- we use 58 bits of this

  r0 := (get_byte(r, 0) << 8) | get_byte(r, 1);
  r1 := (get_byte(r, 2) << 8) | get_byte(r, 3);

  -- The & mask here is to suppress the sign extension on the 32nd bit.
  r2 := ((get_byte(r, 4) << 24) | (get_byte(r, 5) << 16) | (get_byte(r, 6) << 8) | get_byte(r, 7)) & x'0FFFFFFFF'::BIGINT;

  ct := extract(EPOCH FROM clock_timestamp() AT TIME ZONE 'utc') * 1000000;

  ax := ct >> 32;
  bx := ct >> 16 & x'FFFF' :: INT;
  cx := x'4000' :: INT | ((ct >> 4) & x'0FFF' :: INT);
  dx := x'8000' :: INT | ((ct & x'F' :: INT) << 10) | ((r0 >> 6) & x'3F' :: INT);

  ret :=
    LPAD(TO_HEX(ax),8,'0') ||
    LPAD(TO_HEX(bx),4,'0') ||
    LPAD(TO_HEX(cx),4,'0') ||
    LPAD(TO_HEX(dx),4,'0') ||
    LPAD(TO_HEX(r1),4,'0') ||
    LPAD(TO_HEX(r2),8,'0');

  return ret :: UUID;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION tuid_to_compact(tuid UUID)
  RETURNS VARCHAR
  LANGUAGE sql
AS
$$
SELECT replace(translate(encode(decode(replace(tuid::TEXT, '-', ''), 'hex'), 'base64'), '/+', '-_'), '=', '');
$$;

CREATE FUNCTION tuid_from_compact(compact VARCHAR)
  RETURNS UUID
  LANGUAGE sql
AS
$$
SELECT encode(decode(rpad(translate(compact, '-_', '/+'), 24, '='), 'base64'), 'hex')::UUID;
$$;

CREATE OR REPLACE FUNCTION stuid_generate()
  RETURNS BYTEA
LANGUAGE plpgsql
AS $$
DECLARE
  ct BIGINT;
  ret BYTEA;
BEGIN
  ct := extract(EPOCH FROM clock_timestamp() AT TIME ZONE 'utc') * 1000000;
  ret := decode(LPAD(TO_HEX(ct),16,'0'),'hex') || gen_random_bytes(24);
  RETURN ret;
END;
$$;

CREATE FUNCTION tuid_zero()
  RETURNS UUID IMMUTABLE LANGUAGE SQL AS 'SELECT ''00000000-0000-0000-0000-000000000000'' :: UUID';

CREATE FUNCTION max (uuid, uuid)
RETURNS uuid AS $$
BEGIN
  IF $1 IS NULL AND $2 IS NULL
  THEN
    RETURN NULL;
  END IF;

  IF $1 IS NULL
  THEN
    RETURN $2;
  END IF;

  IF $2 IS NULL
  THEN
    RETURN $1;
  END IF;

  IF $1 < $2 THEN
 	RETURN $2;
  END IF;

  RETURN $1;
END;
$$ LANGUAGE plpgsql;

CREATE AGGREGATE max (uuid)
(
    sfunc = max,
    stype = uuid
);

CREATE FUNCTION min (uuid, uuid)
RETURNS uuid AS $$
BEGIN
IF $1 IS NULL AND $2 IS NULL
  THEN
    RETURN NULL;
  END IF;

  IF $1 IS NULL
  THEN
    RETURN $2;
  END IF;

  IF $2 IS NULL
  THEN
    RETURN $1;
  END IF;

  IF $1 > $2 THEN
	RETURN $2;
  END IF;

  RETURN $1;
END;
$$ LANGUAGE plpgsql;

CREATE AGGREGATE min (uuid)
(
    sfunc = min,
    stype = uuid
);

CREATE FUNCTION prevent_change()
  RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Records in table % cannot be %d', TG_TABLE_NAME, lower(TG_OP);
END;
$$;

CREATE FUNCTION set_updated_at()
  RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END
$$;

---------------------------------------------------------------
-- history tracking stuff

SET "audit.user" TO 'SETUP';


---------------------------------------------------------------
-- history tracking

-- audit.user is used to track who did the changes
-- SET "audit.user" TO 'bob@example.com';
-- RESET "audit.user";

-- Only the delta from current state is stored.
--   Inserts fully matched the current state, so entry will be an empty hstore
--   Updates will only record columns modified from current state
--   Deletes will track the entire entry as the current state becomes "nothing"
-- tx is the transaction changes occurred in so you can collate changes that occurred across multiple tables at the same time.
CREATE TABLE
  history (
            tx BIGINT,
            table_name VARCHAR NOT NULL,
            id UUID NOT NULL,
            who VARCHAR NOT NULL,
            tz TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(), -- NOT now() or current_timestamp, we want the clock so a transaction that updates the same data twice won't hit a conflict on insert.
            op CHAR CHECK (op = ANY (ARRAY ['I' :: CHAR, 'U' :: CHAR, 'D' :: CHAR])),
            entry HSTORE,
            PRIMARY KEY (id, tz) -- table_name isn't required because tuids are globally unique, tz is required as the same id can be updated multiple times in one transaction
);

-- NOTE: you may want to partition the history table by table_name

CREATE INDEX history_tx_id_tz ON history (tx, id, tz);
CREATE INDEX history_tn_id_tz ON history (table_name, id, tz);

CREATE TRIGGER history_prevent_change
  BEFORE UPDATE OR DELETE OR TRUNCATE
  ON history
EXECUTE PROCEDURE prevent_change();

CREATE OR REPLACE FUNCTION history_track_tg()
  RETURNS TRIGGER
  LANGUAGE plpgsql
AS
$X$
DECLARE
  who VARCHAR;
  tx BIGINT;
  newhs HSTORE;
  oldhs HSTORE;
  idname VARCHAR;
  id UUID;
BEGIN
  SELECT
    current_setting('audit.user')
  INTO who;

  IF who IS NULL OR who = ''
  THEN
    RAISE EXCEPTION 'audit.user is not set.';
  END IF;

  idname = tg_argv[0];

  tx = pg_current_xact_id ();

  IF tg_op = 'UPDATE'
  THEN
    oldhs = hstore(old);
    newhs = hstore(new);
    IF ((oldhs -> idname) != (newhs -> idname))
    THEN
      RAISE EXCEPTION 'id cannot be changed';
    END IF;

    id = (newhs -> idname) :: UUID;
    -- RAISE NOTICE '%', id;
    INSERT INTO history (id, table_name, tx, who, op, entry) VALUES (id, tg_table_name, tx, who, 'U', oldhs - newhs);
    RETURN new;
  END IF;

  IF tg_op = 'INSERT'
  THEN
    newhs = hstore(new);
    id = (newhs -> idname) :: UUID;
    -- RAISE NOTICE '%', id;
    INSERT INTO history (id, table_name, tx, who, op, entry) VALUES (id, tg_table_name, tx, who, 'I', ''::HSTORE);
    RETURN new;
  END IF;

  IF tg_op = 'DELETE'
  THEN
    oldhs = hstore(old);
    id = (oldhs -> idname) :: UUID;
    -- RAISE NOTICE '%', id;
    INSERT INTO history (id, table_name, tx, who, op, entry) VALUES (id, tg_table_name, tx, who, 'D', oldhs);
    RETURN old;
  END IF;

  RETURN NULL;
END;
$X$;

-- function to setup history table and triggers to prevent history alteration and tracking of changes
CREATE FUNCTION add_history_to_table(table_name VARCHAR, id_column_name VARCHAR = NULL)
  RETURNS VOID
  LANGUAGE plpgsql
AS
$$
BEGIN
  IF id_column_name IS NULL
  THEN
    id_column_name = table_name || '_id';
  END IF;

  -- hook up the trigger
  EXECUTE FORMAT(
    'CREATE TRIGGER %I
      BEFORE UPDATE OR DELETE OR INSERT
      ON %I
      FOR EACH ROW EXECUTE PROCEDURE history_track_tg(%L);
    ',
    table_name || '_history',
    table_name,
    id_column_name
    );
END;
$$;

------------------------------------------------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION create_upsert_using_primary_key(schema_n VARCHAR, table_n VARCHAR) RETURNS VOID
    LANGUAGE plpgsql
AS
$$
DECLARE
    columns                                   VARCHAR[];
    primary_key_columns                       VARCHAR[];
    distinct_columns                          VARCHAR[]; -- columns - pk_columns - ui_columns
    primary_key_columns_literal               VARCHAR;
    upsert_sql                                VARCHAR;
    params_literal                            VARCHAR;
    params_decl_literal                       VARCHAR;
    upsert_columns_literal                    VARCHAR;
    do_sql                                    VARCHAR;
    distinct_columns_set_literal              VARCHAR;
    distinct_table_columns_literal            VARCHAR;
    distinct_excluded_columns_literal         VARCHAR;
    distinct_columns_is_distinct_from_literal VARCHAR;
BEGIN
    SELECT array_agg(column_name :: VARCHAR) INTO columns
    FROM information_schema.columns c
    WHERE c.table_schema = schema_n
      AND c.table_name = table_n;

    SELECT array_agg(a.attname) INTO primary_key_columns
    FROM pg_index x
             JOIN pg_class c ON c.oid = x.indrelid
             JOIN pg_class i ON i.oid = x.indexrelid
             LEFT JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY (x.indkey)
             LEFT JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE ((c.relkind = ANY (ARRAY ['r'::"char", 'm'::"char"])) AND (i.relkind = 'i'::"char"))
      AND x.indisprimary
      AND n.nspname = schema_n
      AND c.relname = table_n;

    SELECT array_agg(v) INTO distinct_columns
    FROM unnest(columns) a(v)
    WHERE v != ALL (primary_key_columns);

    SELECT array_to_string(array_agg(FORMAT(
            '%I %s',
            v || '_',
            trim(LEADING '_' FROM c.udt_name) || CASE c.data_type WHEN 'ARRAY' THEN '[]' ELSE '' END
        )), ', ') INTO params_decl_literal
    FROM unnest(columns) a(v)
             JOIN information_schema.columns c
                  ON c.table_name = table_n AND c.table_schema = schema_n AND c.column_name = v;

    SELECT array_to_string(array_agg(FORMAT('%I', v || '_')), ', ') INTO params_literal
    FROM unnest(columns) a(v);

    SELECT array_to_string(array_agg(FORMAT('%I', v)), ', ') INTO upsert_columns_literal
    FROM unnest(columns) a(v);

    SELECT array_to_string(array_agg(FORMAT('%I', v)), ', ') INTO primary_key_columns_literal
    FROM unnest(primary_key_columns) a(v);

    do_sql = 'DO NOTHING';

    IF cardinality(distinct_columns) > 0 THEN
        SELECT array_to_string(array_agg(FORMAT('%I = %I', v, v || '_')), ', ') INTO distinct_columns_set_literal
        FROM unnest(distinct_columns) a(v);

        SELECT array_to_string(array_agg(FORMAT('%I.%I', table_n, v)), ', ') INTO distinct_table_columns_literal
        FROM unnest(distinct_columns) a(v);

        SELECT array_to_string(array_agg(FORMAT('excluded.%I', v)), ', ') INTO distinct_excluded_columns_literal
        FROM unnest(distinct_columns) a(v);

        distinct_columns_is_distinct_from_literal = FORMAT(
                '       (%s)
                    IS DISTINCT FROM
                        (%s)',
                distinct_table_columns_literal,
                distinct_excluded_columns_literal
            );

        do_sql = FORMAT(
                '   DO UPDATE SET
                        %s
                    WHERE
                        %s',
                distinct_columns_set_literal,
                distinct_columns_is_distinct_from_literal
            );
    END IF;

    upsert_sql = FORMAT(
            $Q$
                CREATE OR REPLACE FUNCTION %I.%I(%s) RETURNS VOID LANGUAGE SQL AS %s%s
                    INSERT INTO %I.%I (%s) VALUES (%s)
                    ON CONFLICT (%s)
                    %s;
                ;%s%s
            $Q$,
            schema_n, table_n || '_upsert', params_decl_literal, '$', '$',
            schema_n, table_n, upsert_columns_literal, params_literal,
            primary_key_columns_literal,
            do_sql,
            '$', '$'
        );
    -- RAISE NOTICE '%', upsert_sql;
    EXECUTE upsert_sql;
END;
$$;

------------------------------------------------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION create_upsert_using_unique_index_and_default_primary_key(schema_n VARCHAR, table_n VARCHAR)
    RETURNS VOID
    LANGUAGE plpgsql
AS
$$
DECLARE
    columns                                   VARCHAR[];
    primary_key_columns                       VARCHAR[];
    unique_index_columns                      VARCHAR[];
    distinct_columns                          VARCHAR[]; -- columns - pk_columns - ui_columns
    upsert_columns                            VARCHAR[]; -- columns - pk_columns
    unique_index_count                        NUMERIC;
    upsert_sql                                VARCHAR;
    params_literal                            VARCHAR;
    params_decl_literal                       VARCHAR;
    upsert_columns_literal                    VARCHAR;
    unique_index_columns_literal              VARCHAR;
    do_sql                                    VARCHAR;
    distinct_columns_set_literal              VARCHAR;
    distinct_table_columns_literal            VARCHAR;
    distinct_excluded_columns_literal         VARCHAR;
    distinct_columns_is_distinct_from_literal VARCHAR;
BEGIN
    SELECT array_agg(column_name :: VARCHAR) INTO columns
    FROM information_schema.columns c
    WHERE c.table_schema = schema_n
      AND c.table_name = table_n;

    SELECT count(i.relname) INTO unique_index_count
    FROM pg_index x
             JOIN pg_class c ON c.oid = x.indrelid
             JOIN pg_class i ON i.oid = x.indexrelid
             LEFT JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE ((c.relkind = ANY (ARRAY ['r'::"char", 'm'::"char"])) AND (i.relkind = 'i'::"char"))
      AND x.indisunique
      AND NOT x.indisprimary
      AND n.nspname = schema_n
      AND c.relname = table_n;

    IF unique_index_count != 1 THEN
        RAISE EXCEPTION '% unique indexes, expected exactly 1', unique_index_count;
    END IF;

    SELECT array_agg(a.attname) INTO primary_key_columns
    FROM pg_index x
             JOIN pg_class c ON c.oid = x.indrelid
             JOIN pg_class i ON i.oid = x.indexrelid
             LEFT JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY (x.indkey)
             LEFT JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE ((c.relkind = ANY (ARRAY ['r'::"char", 'm'::"char"])) AND (i.relkind = 'i'::"char"))
      AND x.indisprimary
      AND n.nspname = schema_n
      AND c.relname = table_n;

    SELECT array_agg(a.attname) INTO unique_index_columns
    FROM pg_index x
             JOIN pg_class c ON c.oid = x.indrelid
             JOIN pg_class i ON i.oid = x.indexrelid
             LEFT JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY (x.indkey)
             LEFT JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE ((c.relkind = ANY (ARRAY ['r'::"char", 'm'::"char"])) AND (i.relkind = 'i'::"char"))
      AND NOT x.indisprimary
      AND x.indisunique
      AND n.nspname = schema_n
      AND c.relname = table_n;

    SELECT array_agg(v) INTO upsert_columns
    FROM unnest(columns) a(v)
    WHERE v != ALL (primary_key_columns);

    SELECT array_agg(v) INTO distinct_columns
    FROM unnest(upsert_columns) a(v)
    WHERE v != ALL (unique_index_columns);

    SELECT array_to_string(array_agg(FORMAT(
            '%I %s',
            v || '_',
            trim(LEADING '_' FROM c.udt_name) || CASE c.data_type WHEN 'ARRAY' THEN '[]' ELSE '' END
        )), ', ') INTO params_decl_literal
    FROM unnest(upsert_columns) a(v)
             JOIN information_schema.columns c
                  ON c.table_name = table_n AND c.table_schema = schema_n AND c.column_name = v;

    SELECT array_to_string(array_agg(FORMAT('%I', v || '_')), ', ') INTO params_literal
    FROM unnest(upsert_columns) a(v);

    SELECT array_to_string(array_agg(FORMAT('%I', v)), ', ') INTO upsert_columns_literal
    FROM unnest(upsert_columns) a(v);

    SELECT array_to_string(array_agg(FORMAT('%I', v)), ', ') INTO unique_index_columns_literal
    FROM unnest(unique_index_columns) a(v);

    do_sql = 'DO NOTHING';

    IF cardinality(distinct_columns) > 0 THEN
        SELECT array_to_string(array_agg(FORMAT('%I = %I', v, v || '_')), ', ') INTO distinct_columns_set_literal
        FROM unnest(distinct_columns) a(v);

        SELECT array_to_string(array_agg(FORMAT('%I.%I', table_n, v)), ', ') INTO distinct_table_columns_literal
        FROM unnest(distinct_columns) a(v);

        SELECT array_to_string(array_agg(FORMAT('excluded.%I', v)), ', ') INTO distinct_excluded_columns_literal
        FROM unnest(distinct_columns) a(v);

        distinct_columns_is_distinct_from_literal = FORMAT(
                '       (%s)
                    IS DISTINCT FROM
                        (%s)',
                distinct_table_columns_literal,
                distinct_excluded_columns_literal
            );

        do_sql = FORMAT(
                '   DO UPDATE SET
                        %s
                    WHERE
                        %s',
                distinct_columns_set_literal,
                distinct_columns_is_distinct_from_literal
            );
    END IF;

    upsert_sql = FORMAT(
            $Q$
                CREATE OR REPLACE FUNCTION %I.%I(%s) RETURNS VOID LANGUAGE SQL AS %s%s
                    INSERT INTO %I.%I (%s) VALUES (%s)
                    ON CONFLICT (%s)
                    %s;
                ;%s%s
            $Q$,
            schema_n, table_n || '_upsert', params_decl_literal, '$', '$',
            schema_n, table_n, upsert_columns_literal, params_literal,
            unique_index_columns_literal,
            do_sql,
            '$', '$'
        );
    -- RAISE NOTICE '%', upsert_sql;
    EXECUTE upsert_sql;
END;
$$;

------------------------------------------------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION create_upsert(schema_n VARCHAR, table_n VARCHAR)
    RETURNS VOID
    LANGUAGE plpgsql
AS
$$
DECLARE
    unique_index_count NUMERIC;
BEGIN
    SELECT count(i.relname) INTO unique_index_count
    FROM pg_index x
             JOIN pg_class c ON c.oid = x.indrelid
             JOIN pg_class i ON i.oid = x.indexrelid
             LEFT JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE ((c.relkind = ANY (ARRAY ['r'::"char", 'm'::"char"])) AND (i.relkind = 'i'::"char"))
      AND x.indisunique
      AND NOT x.indisprimary
      AND n.nspname = schema_n
      AND c.relname = table_n;

    IF unique_index_count = 1 THEN
        PERFORM create_upsert_using_unique_index_and_default_primary_key(schema_n, table_n);
    ELSE
        PERFORM create_upsert_using_primary_key(schema_n, table_n);
    END IF;
END
$$;

------------------------------------------------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION create_upsert(table_n VARCHAR)
    RETURNS VOID
    LANGUAGE plpgsql
AS
$$
BEGIN
    PERFORM create_upsert('public', table_n);
END
$$;

------------------------------------------------------------------------------------------------------

CREATE TABLE meta.migration (
  migration_identifier VARCHAR NOT NULL PRIMARY KEY,
  apply_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

------------------------------------------------------------------------------------------------------

CREATE TABLE "user" (
  user_id UUID NOT NULL DEFAULT tuid_generate() PRIMARY KEY,
  display_name VARCHAR NOT NULL default ''
);

SELECT add_history_to_table('user');

-- a user can have multiple emails
-- an email can only have one user
CREATE TABLE user_n_email (
  user_n_email_id UUID DEFAULT tuid_generate(),
  user_id UUID NOT NULL references "user",
  email VARCHAR NOT NULL UNIQUE, -- an email can only reference 1 user
  "primary" BOOLEAN NOT NULL default FALSE
);
SELECT add_history_to_table('user_n_email');


-- login concept - email(s)
--  _n_ profile concepts: a person, a corp, a POA, etc.
-- profile concept
--  _n_ settings, permissions, etc.


------------------------------------------------------------------------------------------------------

-- a user can have multiple settings
-- a setting has a single instance per user
CREATE TABLE user_n_setting (
  setting_name VARCHAR NOT NULL,
  user_id UUID NOT NULL REFERENCES "user",
  "value" JSONB NOT NULL DEFAULT '{}'::JSONB,
  PRIMARY KEY (user_id, setting_name)
);
SELECT add_history_to_table('user_n_setting');

------------------------------------------------------------------------------------------------------

CREATE UNLOGGED TABLE "session" (
  session_id bytea DEFAULT stuid_generate() PRIMARY KEY,
  user_id UUID references "user", -- can be back filled after creation
  data JSONB DEFAULT '{}'::JSONB NOT NULL,
  create_at TIMESTAMPTZ DEFAULT current_timestamp NOT NULL,
  expire_at TIMESTAMPTZ DEFAULT current_timestamp + '1 hour'::INTERVAL NOT NULL
);
CREATE INDEX session_user_id ON session (user_id);

------------------------------------------------------------------------------------------------------

CREATE TABLE permission (
  permission_name VARCHAR NOT NULL PRIMARY KEY CHECK (permission_name::text ~ '^[A-Z][_A-Z0-9]+$')
);

CREATE TRIGGER permission_no
    BEFORE UPDATE OR DELETE OR TRUNCATE
    ON permission
    EXECUTE PROCEDURE prevent_change();

CREATE TABLE permission_group (
  permission_group_name VARCHAR NOT NULL PRIMARY KEY CHECK (permission_group_name::text ~ '^[A-Z][_A-Z0-9]+$')
);

CREATE TRIGGER permission_group_no
    BEFORE UPDATE OR DELETE OR TRUNCATE
    ON permission_group
    EXECUTE PROCEDURE prevent_change();

CREATE TABLE user_x_permission (
  user_x_permission_id UUID DEFAULT tuid_generate(),
  user_id UUID NOT NULL REFERENCES "user",
  permission_name VARCHAR NOT NULL REFERENCES "permission",
  relation_type VARCHAR NOT NULL DEFAULT 'add' CHECK (relation_type::text = ANY(ARRAY['add'::text, 'remove'::text, 'add_grant'::text])),
  PRIMARY KEY (user_id, permission_name)
);
SELECT add_history_to_table('user_x_permission');

CREATE TABLE user_x_permission_group (
  user_x_permission_group_id UUID DEFAULT tuid_generate(),
  user_id UUID NOT NULL REFERENCES "user",
  permission_group_name VARCHAR NOT NULL REFERENCES permission_group,
  PRIMARY KEY (user_id, permission_group_name)
);
SELECT add_history_to_table('user_x_permission_group');

CREATE TABLE permission_x_permission_group (
  permission_x_permission_group_id UUID DEFAULT tuid_generate(),
  permission_group_name VARCHAR NOT NULL REFERENCES permission_group,
  permission_name VARCHAR NOT NULL REFERENCES permission,
  relation_type VARCHAR NOT NULL DEFAULT 'add' CHECK (relation_type::text = ANY(ARRAY['add'::text, 'remove'::text, 'add_grant'::text]))
);
SELECT add_history_to_table('permission_x_permission_group');


------------------------------------------------------------------------------------------------------
-- system_setting

CREATE TABLE system_setting (
  system_setting VARCHAR PRIMARY KEY,
  value JSONB NOT NULL DEFAULT ''::jsonb
);

SELECT add_history_to_table('system_setting');

------------------------------------------------------------------------------------------------------

SET "audit.user" = '_SETUP_';


------------------------------------------------------------------------------------------------------
-- base permissions
------------------------------------------------------------------------------------------------------

INSERT INTO permission (permission_name)
VALUES
  ('ADMIN_USER_VIEW'),
  ('ADMIN_USER_UPDATE'),
  ('ADMIN_USER_DELETE'),
  ('ADMIN_SYSTEM_SETTINGS_UPDATE'),
  ('ADMIN_PERMISSION_CREATE'),
  ('ADMIN_PERMISSION_UPDATE'),
  ('ADMIN_PERMISSION_DELETE'),
  ('ADMIN_PERMISSION_VIEW'),
  ('ADMIN_PERMISSION_GRANT'),
  ('ADMIN_PERMISSION_GROUP_CREATE'),
  ('ADMIN_PERMISSION_GROUP_UPDATE'),
  ('ADMIN_PERMISSION_GROUP_DELETE'),
  ('ADMIN_PERMISSION_GROUP_VIEW'),
  ('ADMIN_PERMISSION_GROUP_GRANT')
  ;

INSERT INTO permission_group (permission_group_name)
VALUES ('USER_DEFAULT'), ('ADMIN_ALL');

INSERT INTO permission_x_permission_group (permission_group_name, permission_name, relation_type)
SELECT 'ADMIN_ALL', permission_name, 'add_grant' FROM permission;

-- INSERT INTO permission_x_permission_group (permission_group_name, permission_name, relation_type)
-- VALUES ('USER_DEFAULT', 'USER_???', 'add');

------------------------------------------------------------------------------------------------------
-- base system settings
------------------------------------------------------------------------------------------------------

INSERT INTO system_setting
VALUES ('allowed_domains','["gmail.com"]'::jsonb);

------------------------------------------------------------------------------------------------------
-- APPSQL
------------------------------------------------------------------------------------------------------


------------------------------------------------------------------------------------------------------
-- workorder

CREATE TABLE workorder (
  workorder_id uuid NOT NULL PRIMARY KEY,
  context_name VARCHAR NOT NULL,
  current_content_hash VARCHAR NOT NULL,
  frozen_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT workorder_context_name_check CHECK (((context_name)::text ~ '^[\x20-\x7e]+$'::text))
);

CREATE UNIQUE INDEX workorder_allow_only_not_frozen ON workorder USING btree (context_name) WHERE (frozen_at IS NULL);

CREATE TABLE workorder_n_state (
  -- workorder_n_state doesn't have it's own workorder_n_state_id as content_hash is effectively the id.
  content_hash VARCHAR NOT NULL UNIQUE,
  workorder_id uuid NOT NULL references workorder,
  state jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE FUNCTION workorder_hash(workorder_id uuid, context_name VARCHAR, state jsonb)
  RETURNS text
  LANGUAGE sql
  IMMUTABLE STRICT
AS
$$
SELECT
  translate(
    encode(digest(workorder_id::VARCHAR || E'\n'|| context_name || E'\n'|| state::VARCHAR,'sha1'),'base64'),
    '=/+', -- unsafe in a URL param
    '.-_' -- safe in a URL param
  )
$$;

CREATE FUNCTION workorder_by_content_hash(context_name_ VARCHAR, content_hash_ VARCHAR)
  RETURNS TABLE(workorder_id uuid, content_hash VARCHAR, current_content_hash VARCHAR, context_name VARCHAR, state jsonb, frozen_at timestamptz)
  LANGUAGE sql
AS $$
SELECT
  wo.workorder_id,
  ws.content_hash,
  wo.current_content_hash,
  wo.context_name,
  ws.state,
  wo.frozen_at as frozen_at
FROM workorder wo
  JOIN workorder_n_state ws USING(workorder_id)
WHERE ws.content_hash = content_hash_
  AND wo.context_name = context_name_
$$;

CREATE FUNCTION workorder_get_active(context_name_ VARCHAR)
  RETURNS TABLE(workorder_id uuid, context_name VARCHAR, content_hash VARCHAR, current_content_hash VARCHAR, state jsonb)
  LANGUAGE plpgsql
AS $$
DECLARE
  r RECORD; -- because the return table fields become local variables we have to avoid using them in the queries
            -- and instead select into a record.
BEGIN
  SELECT * INTO r
  FROM workorder wo
  WHERE wo.context_name = context_name_ AND wo.frozen_at IS NULL;

  IF r.workorder_id IS NOT NULL THEN -- an active work order already exists
    -- update the output row
    workorder_id = r.workorder_id;
    current_content_hash = r.current_content_hash;
    content_hash = r.current_content_hash;
    context_name = r.context_name;

    -- get the associated state
    SELECT wos.state INTO r
    FROM workorder_n_state wos
    WHERE wos.content_hash = current_content_hash;

    -- update the output row
    state = r.state;
    RETURN NEXT; -- return the output row
  END IF;
END;
$$;

CREATE FUNCTION workorder_get_active(context_name_ VARCHAR, default_state jsonb)
  RETURNS TABLE(workorder_id uuid, context_name VARCHAR, content_hash VARCHAR, current_content_hash VARCHAR, state jsonb)
  LANGUAGE plpgsql
AS $$
DECLARE
  r RECORD; -- because the return table fields become local variables we have to avoid using them in the queries
  -- and instead select into a record.
BEGIN
  SELECT * INTO r
  FROM workorder wo
  WHERE wo.context_name = context_name_ AND wo.frozen_at IS NULL;

  IF r.workorder_id IS NOT NULL THEN -- an active work order already exists
    -- update the output row
    workorder_id = r.workorder_id;
    current_content_hash = r.current_content_hash;
    content_hash = r.current_content_hash;
    context_name = r.context_name;

    -- get the associated state
    SELECT wos.state INTO r
    FROM workorder_n_state wos
    WHERE wos.content_hash = current_content_hash;

    -- update the output row
    state = r.state;
  ELSE
    -- setup the data for the new work order
    workorder_id = tuid_generate();
    state = default_state;
    current_content_hash = workorder_hash(workorder_id, context_name_, state);
    content_hash = current_content_hash;
    context_name = context_name_;

    -- create a new work_order
    BEGIN
      -- this can fail with a duplicate
      INSERT INTO workorder (workorder_id, context_name, current_content_hash)
      VALUES (workorder_id, context_name, current_content_hash);

      INSERT INTO workorder_n_state (workorder_id, state, content_hash)
      VALUES (workorder_id, state, current_content_hash)
      ON CONFLICT DO NOTHING;

      -- it is possible another tx already created it
    EXCEPTION
      WHEN unique_violation THEN
        -- grab the other one that was created in parallel
        SELECT * INTO r
        FROM workorder wo
        WHERE wo.context_name = context_name_
          AND wo.frozen_at IS NULL;

        -- it's also possible a parallel one was created
        -- and then frozen before we got it...
        -- at which point we give up because
        -- that really should not happen. (I know, famous last words)
        IF r.current_content_hash IS NULL THEN
          RAISE EXCEPTION 'Could not create workorder for %; duplicate detected.', context_name_;
        END IF;

        -- update the output row
        current_content_hash = r.current_content_hash;
        content_hash = r.current_content_hash;
        workorder_id = r.workorder_id;

        -- get the associated state
        SELECT * INTO r
        FROM workorder_n_state wos
        WHERE wos.content_hash = current_content_hash;

        -- update the output row
        state = r.state;
    END;
  END IF;

  RETURN NEXT; -- return the output row
END;
$$;

CREATE FUNCTION workorder_update(context_name_ VARCHAR, new_state_ jsonb)
  RETURNS TABLE(workorder_id uuid, context_name VARCHAR, content_hash VARCHAR, current_content_hash VARCHAR, state jsonb)
  LANGUAGE plpgsql
AS $$
DECLARE
  r RECORD;
  workorder_id_ UUID;
  current_content_hash_ VARCHAR;
BEGIN
  -- set the output field
  context_name = context_name_;

  SELECT * INTO r FROM workorder_get_active(context_name_);

  IF r.workorder_id IS NULL THEN
      -- no unfrozen work_order exists
      RETURN; -- not NEXT, i.e. return no row, nothing was saved
  END IF;

  -- set the output field
  workorder_id = r.workorder_id;
  state = r.state;

  current_content_hash = workorder_hash(workorder_id, context_name_, new_state_);
  content_hash = current_content_hash;

  -- if it actually changed.
  IF current_content_hash != r.current_content_hash THEN
      INSERT INTO workorder_n_state (content_hash, workorder_id, state)
      VALUES (current_content_hash, workorder_id, new_state_)
      -- could already exist from a previous update
      ON CONFLICT DO NOTHING;

      -- set the output field
      state = new_state_;

      -- update the current content hash so resuming will now resume from here
      workorder_id_ = workorder_id;
      current_content_hash_ = current_content_hash;

      UPDATE workorder SET current_content_hash = current_content_hash_
      WHERE workorder.workorder_id = workorder_id_
        AND workorder.current_content_hash IS DISTINCT FROM current_content_hash_;
  END IF;

  RETURN NEXT; -- return the data
END;
$$;

CREATE FUNCTION workorder_update(context_name_ VARCHAR, original_content_hash_ VARCHAR, new_state_ jsonb)
  RETURNS TABLE(workorder_id uuid, context_name VARCHAR, content_hash VARCHAR, current_content_hash VARCHAR, state jsonb, updated boolean)
  LANGUAGE plpgsql
AS $$
DECLARE
  r RECORD;
  workorder_id_ UUID;
  current_content_hash_ VARCHAR;
BEGIN
  -- set the output field
  context_name = context_name_;
  updated = false;

  SELECT * INTO r
  FROM workorder_get_active(context_name_);

  workorder_id = r.workorder_id;
  state = r.state;

  IF r.current_content_hash != original_content_hash_ THEN
    current_content_hash = r.current_content_hash;
    content_hash = r.current_content_hash;
    -- conflict, return the latest state with updated as false
    RETURN NEXT;
  END IF;

  current_content_hash = workorder_hash(workorder_id, context_name_, new_state_);
  content_hash = r.current_content_hash;

  -- only bother if it really is a new state
  IF current_content_hash != original_content_hash_ THEN
    INSERT INTO workorder_n_state (content_hash, workorder_id, state)
    VALUES (current_content_hash, workorder_id, new_state_)
    -- might match an previously existing state, which is fine.
    ON CONFLICT DO NOTHING;

    -- set the output field
    state = new_state_;

    -- update the current content hash of the work flow
    workorder_id_ = workorder_id;
    current_content_hash_ = current_content_hash;
    UPDATE workorder
    SET current_content_hash = current_content_hash_
    WHERE workorder.workorder_id = workorder_id_
      AND workorder.current_content_hash IS DISTINCT FROM current_content_hash_;
  END IF;
  -- updated here really means the state matches what the request to make it provided
  -- even if that technically doesn't change it.
  updated = true;
  RETURN NEXT;
END;
$$;

CREATE FUNCTION workorder_freeze(context_name_ VARCHAR, original_content_hash_ VARCHAR)
  RETURNS TABLE(workorder_id uuid, context_name VARCHAR, content_hash VARCHAR, current_content_hash VARCHAR, state jsonb, frozen_at timestamp with time zone)
  LANGUAGE plpgsql
AS $$
DECLARE
  r RECORD;
  u RECORD;
  workorder_id_ UUID;
BEGIN
  -- set the output field
  context_name = context_name_;
  content_hash = original_content_hash_;

  SELECT * INTO r
  FROM workorder_get_active(context_name_);
  workorder_id = r.workorder_id;

  -- set the output field
  current_content_hash = r.current_content_hash;
  state = r.state;

  IF r.current_content_hash = original_content_hash_ THEN
    -- only freeze the work order if it hasn't changed since we last looked at it.
    workorder_id_ = workorder_id;

    UPDATE workorder
    SET frozen_at = now()
    WHERE workorder.workorder_id = workorder_id_
      AND workorder.current_content_hash = original_content_hash_
    RETURNING workorder.frozen_at
      INTO u;

    -- frozen_at will only be non null if we actually froze the work order
    frozen_at = u.frozen_at;
  END IF;

  RETURN NEXT; -- return the row
END;
$$;

------------------------------------------------------------------------------------------------------

reset "audit.user";

------------------------------------------------------------------------------------------------------

create table foo (foo_id UUID PRIMARY KEY);

create table bar (bar_id UUID PRIMARY KEY);

create table foo_n_bar
(
  foo_id UUID NOT NULL REFERENCES foo ON DELETE CASCADE,
  bar_id UUID NOT NULL REFERENCES bar ON DELETE CASCADE,
  PRIMARY KEY (foo_id, bar_id)
);

delete from foo where foo_id=$(foo_id);
