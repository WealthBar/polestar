-- some conventions:
-- tables are singular
-- id's are always prefixed by the table name (even in the table itself) to enable USING
-- a_1_b is an optional attribute table (one or zero b per a)
-- a_e_b is an extension table (exactly one b per a, PITA to handle case)
-- a_n_b is a detail table (many b per a)
-- a_x_b is an xref table (many b to many b)

SET search_path = func;

CREATE OR REPLACE FUNCTION func.raise_exception(what VARCHAR)
  RETURNS VOID AS
$$
BEGIN
  RAISE EXCEPTION '%', what;
END
$$ LANGUAGE plpgsql;

-- version 4 of tuid_generate
CREATE OR REPLACE FUNCTION func.tuid_generate()
  RETURNS UUID AS
$$
DECLARE
  ct BIGINT;
  r BYTEA;
  r0 BIGINT;
  r1 BIGINT;
  r2 BIGINT;
  ax BIGINT;
  bx BIGINT;
  cx BIGINT;
  dx BIGINT;
  ret VARCHAR;
BEGIN
  r := func.gen_random_bytes(7);

  r0 := GET_BYTE(r, 0);
  r1 := (GET_BYTE(r, 1) << 8) | GET_BYTE(r, 2);

  -- The & mask here is to suppress the sign extension on the 32nd bit.
  r2 :=
      ((GET_BYTE(r, 3) << 24) | (GET_BYTE(r, 4) << 16) | (GET_BYTE(r, 5) << 8) | GET_BYTE(r, 6)) & x'0FFFFFFFF'::BIGINT;

  ct := EXTRACT(EPOCH FROM CLOCK_TIMESTAMP() AT TIME ZONE 'utc') * 1000000;

  ax := ct >> 32;
  bx := ct >> 16 & x'FFFF' :: INT;
  cx := x'4000' :: INT | ((ct >> 4) & x'0FFF' :: INT);
  dx := x'8000' :: INT | ((ct & x'0F' :: INT) << 8) | (r0 & x'FF' :: INT);

  ret := LPAD(TO_HEX(ax), 8, '0') ||
         LPAD(TO_HEX(bx), 4, '0') ||
         LPAD(TO_HEX(cx), 4, '0') ||
         LPAD(TO_HEX(dx), 4, '0') ||
         LPAD(TO_HEX(r1), 4, '0') ||
         LPAD(TO_HEX(r2), 8, '0');

  RETURN ret :: UUID;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION func.tuid_tz(tuid UUID)
  RETURNS TIMESTAMPTZ
  LANGUAGE sql
AS
$$
WITH t AS (
  SELECT tuid::VARCHAR AS x
  )
SELECT (
                 'x'
                 || SUBSTR(t.x, 1, 8) -- xxxxxxxx-0000-4000-8000-000000000000
               || SUBSTR(t.x, 10, 4) -- 00000000-xxxx-4000-8000-000000000000
             || SUBSTR(t.x, 16, 3) -- 00000000-0000-4xxx-8000-000000000000
           || SUBSTR(t.x, 21, 1) -- 00000000-0000-4000-8x00-000000000000
         )::BIT(64)::BIGINT * INTERVAL '1 microsecond' + TIMESTAMPTZ 'epoch'
FROM
  t;
$$;

CREATE FUNCTION func.tuid_to_compact(tuid UUID)
  RETURNS VARCHAR
  LANGUAGE sql
AS
$$
SELECT REPLACE(TRANSLATE(ENCODE(DECODE(REPLACE(tuid::TEXT, '-', ''), 'hex'), 'base64'), '/+', '-_'), '=', '');
$$;

CREATE FUNCTION func.tuid_from_compact(compact VARCHAR)
  RETURNS UUID
  LANGUAGE sql
AS
$$
SELECT ENCODE(DECODE(RPAD(TRANSLATE(compact, '-_', '/+'), 24, '='), 'base64'), 'hex')::UUID;
$$;

CREATE OR REPLACE FUNCTION stuid_generate()
  RETURNS BYTEA
  LANGUAGE plpgsql
AS
$$
DECLARE
  ct BIGINT;
  ret BYTEA;
BEGIN
  ct := EXTRACT(EPOCH FROM CLOCK_TIMESTAMP() AT TIME ZONE 'utc') * 1000000;
  ret := DECODE(LPAD(TO_HEX(ct), 16, '0'), 'hex') || gen_random_bytes(24);
  RETURN ret;
END;
$$;


CREATE FUNCTION func.stuid_tz(stuid VARCHAR)
  RETURNS TIMESTAMPTZ
  LANGUAGE sql
AS
$$
SELECT ('x' || SUBSTR(stuid, 1, 16))::BIT(64)::BIGINT * INTERVAL '1 microsecond' + TIMESTAMPTZ 'epoch';
$$;

CREATE FUNCTION func.tuid_zero()
  RETURNS UUID
  IMMUTABLE
  LANGUAGE sql AS
'SELECT ''00000000-0000-0000-0000-000000000000'' :: UUID';

CREATE FUNCTION func.max(UUID, UUID)
  RETURNS UUID AS
$$
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

CREATE AGGREGATE func.max (UUID)
  (
  SFUNC = max,
  STYPE = UUID
  );

CREATE FUNCTION func.min(UUID, UUID)
  RETURNS UUID AS
$$
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

CREATE AGGREGATE func.min (UUID)
  (
  SFUNC = min,
  STYPE = UUID
  );

CREATE FUNCTION func.prevent_change()
  RETURNS TRIGGER
  LANGUAGE plpgsql
AS
$$
BEGIN
  RAISE EXCEPTION 'Records in table % cannot be %d', tg_table_name, LOWER(tg_op);
END;
$$;

---------------------------------------------------------------
-- history tracking stuff

SET "audit.user" TO 'SETUP';


---------------------------------------------------------------
-- history tracking: staff

-- audit.user is used to track who did the changes
-- SET "audit.user" TO 'bob@example.com';
-- RESET "audit.user";

-- Only the delta from current state is stored.
--   Inserts fully matched the current state, so entry will be an empty hstore
--   Updates will only record columns modified from current state
--   Deletes will track the entire entry as the current state becomes "nothing"
-- tx is the transaction changes occurred in so you can collate changes that occurred across multiple tables at the same time.
CREATE TABLE
  staff.history
(
  tx BIGINT,
  schema_name VARCHAR NOT NULL,
  table_name VARCHAR NOT NULL,
  id UUID NOT NULL,
  who VARCHAR NOT NULL,
  tz TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(), -- NOT now() or current_timestamp, we want the clock so a transaction that updates the same data twice won't hit a conflict on insert.
  op CHAR CHECK (op = ANY (ARRAY ['I' :: CHAR, 'U' :: CHAR, 'D' :: CHAR])),
  entry HSTORE,
  PRIMARY KEY (id, tz)                               -- schema_name/table_name isn't required because tuids are globally unique, tz is required as the same id can be updated multiple times in one transaction
);

-- NOTE: you may want to partition the history table by schema_name, table_name

CREATE INDEX history_tn_id_tz ON staff.history (schema_name, table_name, id, tz);

CREATE TRIGGER history_prevent_change
  BEFORE UPDATE OR DELETE OR TRUNCATE
  ON staff.history
EXECUTE PROCEDURE func.prevent_change();


CREATE OR REPLACE FUNCTION staff.history_track_tg()
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
  SELECT CURRENT_SETTING('audit.user')
  INTO who;

  IF who IS NULL OR who = ''
  THEN
    RAISE EXCEPTION 'audit.user is not set.';
  END IF;

  idname = tg_argv[0];

  tx = pg_current_xact_id();

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
    INSERT INTO
      staff.history (id, schema_name, table_name, tx, who, op, entry)
    VALUES (id, tg_table_schema, tg_table_name, tx, who, 'U', oldhs - newhs);
    RETURN new;
  END IF;

  IF tg_op = 'INSERT'
  THEN
    newhs = hstore(new);
    id = (newhs -> idname) :: UUID;
    -- RAISE NOTICE '%', id;
    INSERT INTO
      staff.history (id, schema_name, table_name, tx, who, op, entry)
    VALUES (id, tg_table_schema, tg_table_name, tx, who, 'I', ''::HSTORE);
    RETURN new;
  END IF;

  IF tg_op = 'DELETE'
  THEN
    oldhs = hstore(old);
    id = (oldhs -> idname) :: UUID;
    -- RAISE NOTICE '%', id;
    INSERT INTO
      staff.history (id, schema_name, table_name, tx, who, op, entry)
    VALUES (id, tg_table_schema, tg_table_name, tx, who, 'D', oldhs);
    RETURN old;
  END IF;

  RETURN NULL;
END;
$X$;

CREATE FUNCTION staff.add_history_to_table(table_name VARCHAR, id_column_name VARCHAR = NULL)
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
      AFTER UPDATE OR DELETE OR INSERT
      ON staff.%I
      FOR EACH ROW EXECUTE PROCEDURE staff.history_track_tg(%L);
    ',
    table_name || '_history',
    table_name,
    id_column_name
    );
END;
$$;
---------------------------------------------------------------
-- history tracking: meta

CREATE TABLE
  meta.history
(
  tx BIGINT,
  schema_name VARCHAR NOT NULL,
  table_name VARCHAR NOT NULL,
  id UUID NOT NULL,
  who VARCHAR NOT NULL,
  tz TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(), -- NOT now() or current_timestamp, we want the clock so a transaction that updates the same data twice won't hit a conflict on insert.
  op CHAR CHECK (op = ANY (ARRAY ['I' :: CHAR, 'U' :: CHAR, 'D' :: CHAR])),
  entry HSTORE,
  PRIMARY KEY (id, tz)                               -- schema_name/table_name isn't required because tuids are globally unique, tz is required as the same id can be updated multiple times in one transaction
);

-- NOTE: you may want to partition the history table by schema_name, table_name

CREATE INDEX history_tn_id_tz ON meta.history (schema_name, table_name, id, tz);

CREATE TRIGGER history_prevent_change
  BEFORE UPDATE OR DELETE OR TRUNCATE
  ON meta.history
EXECUTE PROCEDURE func.prevent_change();

CREATE OR REPLACE FUNCTION meta.history_track_tg()
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
  SELECT CURRENT_SETTING('audit.user')
  INTO who;

  IF who IS NULL OR who = ''
  THEN
    RAISE EXCEPTION 'audit.user is not set.';
  END IF;

  idname = tg_argv[0];

  tx = pg_current_xact_id();

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
    INSERT INTO
      meta.history (id, schema_name, table_name, tx, who, op, entry)
    VALUES (id, tg_table_schema, tg_table_name, tx, who, 'U', oldhs - newhs);
    RETURN new;
  END IF;

  IF tg_op = 'INSERT'
  THEN
    newhs = hstore(new);
    id = (newhs -> idname) :: UUID;
    -- RAISE NOTICE '%', id;
    INSERT INTO
      meta.history (id, schema_name, table_name, tx, who, op, entry)
    VALUES (id, tg_table_schema, tg_table_name, tx, who, 'I', ''::HSTORE);
    RETURN new;
  END IF;

  IF tg_op = 'DELETE'
  THEN
    oldhs = hstore(old);
    id = (oldhs -> idname) :: UUID;
    -- RAISE NOTICE '%', id;
    INSERT INTO
      meta.history (id, schema_name, table_name, tx, who, op, entry)
    VALUES (id, tg_table_schema, tg_table_name, tx, who, 'D', oldhs);
    RETURN old;
  END IF;

  RETURN NULL;
END;
$X$;

-- function to setup history table and triggers to prevent history alteration and tracking of changes
CREATE FUNCTION meta.add_history_to_table(table_name VARCHAR, id_column_name VARCHAR = NULL)
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
      AFTER UPDATE OR DELETE OR INSERT
      ON meta.%I
      FOR EACH ROW EXECUTE PROCEDURE meta.history_track_tg(%L);
    ',
    table_name || '_history',
    table_name,
    id_column_name
    );
END;
$$;

---------------------------------------------------------------
-- history tracking: client

CREATE TABLE
  client.history
(
  tx BIGINT,
  schema_name VARCHAR NOT NULL,
  table_name VARCHAR NOT NULL,
  id UUID NOT NULL,
  who VARCHAR NOT NULL,
  tz TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(), -- NOT now() or current_timestamp, we want the clock so a transaction that updates the same data twice won't hit a conflict on insert.
  op CHAR CHECK (op = ANY (ARRAY ['I' :: CHAR, 'U' :: CHAR, 'D' :: CHAR])),
  entry HSTORE,
  PRIMARY KEY (id, tz)                               -- schema_name/table_name isn't required because tuids are globally unique, tz is required as the same id can be updated multiple times in one transaction
);

-- NOTE: you may want to partition the history table by schema_name, table_name

CREATE INDEX history_tn_id_tz ON client.history (schema_name, table_name, id, tz);

CREATE TRIGGER history_prevent_change
  BEFORE UPDATE OR DELETE OR TRUNCATE
  ON client.history
EXECUTE PROCEDURE func.prevent_change();

CREATE OR REPLACE FUNCTION client.history_track_tg()
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
  SELECT CURRENT_SETTING('audit.user')
  INTO who;

  IF who IS NULL OR who = ''
  THEN
    RAISE EXCEPTION 'audit.user is not set.';
  END IF;

  idname = tg_argv[0];

  tx = pg_current_xact_id();

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
    INSERT INTO
      client.history (id, schema_name, table_name, tx, who, op, entry)
    VALUES (id, tg_table_schema, tg_table_name, tx, who, 'U', oldhs - newhs);
    RETURN new;
  END IF;

  IF tg_op = 'INSERT'
  THEN
    newhs = hstore(new);
    id = (newhs -> idname) :: UUID;
    -- RAISE NOTICE '%', id;
    INSERT INTO
      client.history (id, schema_name, table_name, tx, who, op, entry)
    VALUES (id, tg_table_schema, tg_table_name, tx, who, 'I', ''::HSTORE);
    RETURN new;
  END IF;

  IF tg_op = 'DELETE'
  THEN
    oldhs = hstore(old);
    id = (oldhs -> idname) :: UUID;
    -- RAISE NOTICE '%', id;
    INSERT INTO
      client.history (id, schema_name, table_name, tx, who, op, entry)
    VALUES (id, tg_table_schema, tg_table_name, tx, who, 'D', oldhs);
    RETURN old;
  END IF;

  RETURN NULL;
END;
$X$;

-- function to setup history table and triggers to prevent history alteration and tracking of changes
CREATE FUNCTION client.add_history_to_table(table_name VARCHAR, id_column_name VARCHAR = NULL)
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
      AFTER UPDATE OR DELETE OR INSERT
      ON client.%I
      FOR EACH ROW EXECUTE PROCEDURE client.history_track_tg(%L);
    ',
    table_name || '_history',
    table_name,
    id_column_name
    );
END;
$$;
------------------------------------------------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION func.create_upsert_using_primary_key(schema_n VARCHAR, table_n VARCHAR) RETURNS VOID
  LANGUAGE plpgsql
AS
$$
DECLARE
  columns VARCHAR[];
  primary_key_columns VARCHAR[];
  distinct_columns VARCHAR[]; -- columns - pk_columns - ui_columns
  primary_key_columns_literal VARCHAR;
  upsert_sql VARCHAR;
  params_literal VARCHAR;
  params_decl_literal VARCHAR;
  upsert_columns_literal VARCHAR;
  do_sql VARCHAR;
  distinct_columns_set_literal VARCHAR;
  distinct_table_columns_literal VARCHAR;
  distinct_excluded_columns_literal VARCHAR;
  distinct_columns_is_distinct_from_literal VARCHAR;
BEGIN
  SELECT ARRAY_AGG(column_name :: VARCHAR)
  INTO columns
  FROM
    information_schema.columns c
  WHERE c.table_schema = schema_n
    AND c.table_name = table_n;

  SELECT ARRAY_AGG(a.attname)
  INTO primary_key_columns
  FROM
    pg_index x
    JOIN pg_class c
    ON c.oid = x.indrelid
    JOIN pg_class i
    ON i.oid = x.indexrelid
    LEFT JOIN pg_attribute a
    ON a.attrelid = c.oid AND a.attnum = ANY (x.indkey)
    LEFT JOIN pg_namespace n
    ON n.oid = c.relnamespace
  WHERE ((c.relkind = ANY (ARRAY ['r'::CHAR, 'm'::CHAR])) AND (i.relkind = 'i'::CHAR))
    AND x.indisprimary
    AND n.nspname = schema_n
    AND c.relname = table_n;

  SELECT ARRAY_AGG(v)
  INTO distinct_columns
  FROM
    UNNEST(columns) a(v)
  WHERE v != ALL (primary_key_columns);

  SELECT ARRAY_TO_STRING(ARRAY_AGG(FORMAT(
    '%I %s',
    v || '_',
    TRIM(LEADING '_' FROM c.udt_name) || CASE c.data_type WHEN 'ARRAY' THEN '[]' ELSE '' END
    )), ', ')
  INTO params_decl_literal
  FROM
    UNNEST(columns) a(v)
    JOIN information_schema.columns c
    ON c.table_name = table_n AND c.table_schema = schema_n AND c.column_name = v;

  SELECT ARRAY_TO_STRING(ARRAY_AGG(FORMAT('%I', v || '_')), ', ')
  INTO params_literal
  FROM
    UNNEST(columns) a(v);

  SELECT ARRAY_TO_STRING(ARRAY_AGG(FORMAT('%I', v)), ', ')
  INTO upsert_columns_literal
  FROM
    UNNEST(columns) a(v);

  SELECT ARRAY_TO_STRING(ARRAY_AGG(FORMAT('%I', v)), ', ')
  INTO primary_key_columns_literal
  FROM
    UNNEST(primary_key_columns) a(v);

  do_sql = 'DO NOTHING';

  IF CARDINALITY(distinct_columns) > 0 THEN
    SELECT ARRAY_TO_STRING(ARRAY_AGG(FORMAT('%I = %I', v, v || '_')), ', ')
    INTO distinct_columns_set_literal
    FROM
      UNNEST(distinct_columns) a(v);

    SELECT ARRAY_TO_STRING(ARRAY_AGG(FORMAT('%I.%I', table_n, v)), ', ')
    INTO distinct_table_columns_literal
    FROM
      UNNEST(distinct_columns) a(v);

    SELECT ARRAY_TO_STRING(ARRAY_AGG(FORMAT('excluded.%I', v)), ', ')
    INTO distinct_excluded_columns_literal
    FROM
      UNNEST(distinct_columns) a(v);

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

CREATE OR REPLACE FUNCTION func.create_upsert_using_unique_index_and_default_primary_key(schema_n VARCHAR, table_n VARCHAR)
  RETURNS VOID
  LANGUAGE plpgsql
AS
$$
DECLARE
  columns VARCHAR[];
  primary_key_columns VARCHAR[];
  unique_index_columns VARCHAR[];
  distinct_columns VARCHAR[]; -- columns - pk_columns - ui_columns
  upsert_columns VARCHAR[]; -- columns - pk_columns
  unique_index_count NUMERIC;
  upsert_sql VARCHAR;
  params_literal VARCHAR;
  params_decl_literal VARCHAR;
  upsert_columns_literal VARCHAR;
  unique_index_columns_literal VARCHAR;
  do_sql VARCHAR;
  distinct_columns_set_literal VARCHAR;
  distinct_table_columns_literal VARCHAR;
  distinct_excluded_columns_literal VARCHAR;
  distinct_columns_is_distinct_from_literal VARCHAR;
BEGIN
  SELECT ARRAY_AGG(column_name :: VARCHAR)
  INTO columns
  FROM
    information_schema.columns c
  WHERE c.table_schema = schema_n
    AND c.table_name = table_n;

  SELECT COUNT(i.relname)
  INTO unique_index_count
  FROM
    pg_index x
    JOIN pg_class c
    ON c.oid = x.indrelid
    JOIN pg_class i
    ON i.oid = x.indexrelid
    LEFT JOIN pg_namespace n
    ON n.oid = c.relnamespace
  WHERE ((c.relkind = ANY (ARRAY ['r'::CHAR, 'm'::CHAR])) AND (i.relkind = 'i'::CHAR))
    AND x.indisunique
    AND NOT x.indisprimary
    AND n.nspname = schema_n
    AND c.relname = table_n;

  IF unique_index_count != 1 THEN
    RAISE EXCEPTION '% unique indexes, expected exactly 1', unique_index_count;
  END IF;

  SELECT ARRAY_AGG(a.attname)
  INTO primary_key_columns
  FROM
    pg_index x
    JOIN pg_class c
    ON c.oid = x.indrelid
    JOIN pg_class i
    ON i.oid = x.indexrelid
    LEFT JOIN pg_attribute a
    ON a.attrelid = c.oid AND a.attnum = ANY (x.indkey)
    LEFT JOIN pg_namespace n
    ON n.oid = c.relnamespace
  WHERE ((c.relkind = ANY (ARRAY ['r'::CHAR, 'm'::CHAR])) AND (i.relkind = 'i'::CHAR))
    AND x.indisprimary
    AND n.nspname = schema_n
    AND c.relname = table_n;

  SELECT ARRAY_AGG(a.attname)
  INTO unique_index_columns
  FROM
    pg_index x
    JOIN pg_class c
    ON c.oid = x.indrelid
    JOIN pg_class i
    ON i.oid = x.indexrelid
    LEFT JOIN pg_attribute a
    ON a.attrelid = c.oid AND a.attnum = ANY (x.indkey)
    LEFT JOIN pg_namespace n
    ON n.oid = c.relnamespace
  WHERE ((c.relkind = ANY (ARRAY ['r'::CHAR, 'm'::CHAR])) AND (i.relkind = 'i'::CHAR))
    AND NOT x.indisprimary
    AND x.indisunique
    AND n.nspname = schema_n
    AND c.relname = table_n;

  SELECT ARRAY_AGG(v)
  INTO upsert_columns
  FROM
    UNNEST(columns) a(v)
  WHERE v != ALL (primary_key_columns);

  SELECT ARRAY_AGG(v)
  INTO distinct_columns
  FROM
    UNNEST(upsert_columns) a(v)
  WHERE v != ALL (unique_index_columns);

  SELECT ARRAY_TO_STRING(ARRAY_AGG(FORMAT(
    '%I %s',
    v || '_',
    TRIM(LEADING '_' FROM c.udt_name) || CASE c.data_type WHEN 'ARRAY' THEN '[]' ELSE '' END
    )), ', ')
  INTO params_decl_literal
  FROM
    UNNEST(upsert_columns) a(v)
    JOIN information_schema.columns c
    ON c.table_name = table_n AND c.table_schema = schema_n AND c.column_name = v;

  SELECT ARRAY_TO_STRING(ARRAY_AGG(FORMAT('%I', v || '_')), ', ')
  INTO params_literal
  FROM
    UNNEST(upsert_columns) a(v);

  SELECT ARRAY_TO_STRING(ARRAY_AGG(FORMAT('%I', v)), ', ')
  INTO upsert_columns_literal
  FROM
    UNNEST(upsert_columns) a(v);

  SELECT ARRAY_TO_STRING(ARRAY_AGG(FORMAT('%I', v)), ', ')
  INTO unique_index_columns_literal
  FROM
    UNNEST(unique_index_columns) a(v);

  do_sql = 'DO NOTHING';

  IF CARDINALITY(distinct_columns) > 0 THEN
    SELECT ARRAY_TO_STRING(ARRAY_AGG(FORMAT('%I = %I', v, v || '_')), ', ')
    INTO distinct_columns_set_literal
    FROM
      UNNEST(distinct_columns) a(v);

    SELECT ARRAY_TO_STRING(ARRAY_AGG(FORMAT('%I.%I', table_n, v)), ', ')
    INTO distinct_table_columns_literal
    FROM
      UNNEST(distinct_columns) a(v);

    SELECT ARRAY_TO_STRING(ARRAY_AGG(FORMAT('excluded.%I', v)), ', ')
    INTO distinct_excluded_columns_literal
    FROM
      UNNEST(distinct_columns) a(v);

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

CREATE OR REPLACE FUNCTION func.create_upsert(schema_n VARCHAR, table_n VARCHAR)
  RETURNS VOID
  LANGUAGE plpgsql
AS
$$
DECLARE
  unique_index_count NUMERIC;
BEGIN
  SELECT COUNT(i.relname)
  INTO unique_index_count
  FROM
    pg_index x
    JOIN pg_class c
    ON c.oid = x.indrelid
    JOIN pg_class i
    ON i.oid = x.indexrelid
    LEFT JOIN pg_namespace n
    ON n.oid = c.relnamespace
  WHERE ((c.relkind = ANY (ARRAY ['r'::CHAR, 'm'::CHAR])) AND (i.relkind = 'i'::CHAR))
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

------------------------------------------------------------------------------------------------------

CREATE FUNCTION func.aes_encrypt(ivkey BYTEA, what TEXT)
  RETURNS BYTEA
  LANGUAGE sql
AS
$$
SELECT encrypt_iv(
  DECODE(what, 'escape'),
  SUBSTRING(ivkey::BYTEA, 1, 32),
  SUBSTRING(ivkey::BYTEA, 33, 16),
  'AES'
  )
$$;

CREATE FUNCTION func.aes_encrypt(ivkey BYTEA, what NUMERIC)
  RETURNS BYTEA
  LANGUAGE sql
AS
$$
SELECT encrypt_iv(
  DECODE(what::TEXT, 'escape'),
  SUBSTRING(ivkey::BYTEA, 1, 32),
  SUBSTRING(ivkey::BYTEA, 33, 16),
  'AES'
  )
$$;

CREATE FUNCTION func.aes_decrypt_to_text(ivkey BYTEA, what BYTEA)
  RETURNS TEXT
  LANGUAGE sql
AS
$$
SELECT ENCODE(
  decrypt_iv(
    what,
    SUBSTRING(ivkey::BYTEA, 1, 32),
    SUBSTRING(ivkey::BYTEA, 33, 16),
    'AES'
    ),
  'escape')
$$;

CREATE FUNCTION func.aes_decrypt_to_numeric(ivkey BYTEA, what BYTEA)
  RETURNS NUMERIC
  LANGUAGE sql
AS
$$
SELECT ENCODE(
  decrypt_iv(
    what,
    SUBSTRING(ivkey::BYTEA, 1, 32),
    SUBSTRING(ivkey::BYTEA, 33, 16),
    'AES'
    ),
  'escape') :: NUMERIC
$$;

------------------------------------------------------------------------------------------------------
CREATE TABLE meta.migration
(
  migration_identifier VARCHAR NOT NULL PRIMARY KEY,
  apply_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
------------------------------------------------------------------------------------------------------
CREATE TABLE client.brand
(
  brand_id UUID NOT NULL DEFAULT func.tuid_generate() UNIQUE,
  brand_name VARCHAR PRIMARY KEY
);
SELECT client.add_history_to_table('brand');

CREATE TABLE client.locale
(
  locale_id UUID NOT NULL DEFAULT func.tuid_generate() UNIQUE,
  locale_name VARCHAR PRIMARY KEY
);
SELECT client.add_history_to_table('locale');

CREATE TABLE client.jurisdiction
(
  jurisdiction_id UUID NOT NULL DEFAULT func.tuid_generate() UNIQUE,
  jurisdiction_name VARCHAR PRIMARY KEY
);
SELECT client.add_history_to_table('jurisdiction');

CREATE TABLE client.system
(
  system_id UUID NOT NULL DEFAULT func.tuid_generate() UNIQUE,
  system_name VARCHAR PRIMARY KEY,
  domain VARCHAR NOT NULL UNIQUE,
  access_key VARCHAR NOT NULL UNIQUE,
  secret_key VARCHAR NOT NULL,
  error_url VARCHAR NOT NULL
);
SELECT client.add_history_to_table('system');

CREATE TABLE client.form_key
(
  form_key_id UUID NOT NULL DEFAULT func.tuid_generate() UNIQUE,
  form_key_name VARCHAR NOT NULL,
  system_name VARCHAR REFERENCES client.system ON DELETE RESTRICT,
  completion_url VARCHAR NOT NULL, -- on completion
  exit_url VARCHAR NOT NULL,
  expired_url VARCHAR NOT NULL,
  completed_url VARCHAR NOT NULL,  -- already complete
  flow_name VARCHAR NOT NULL,
  PRIMARY KEY (system_name, form_key_name)
);

CREATE TABLE client.flow
(
  flow_id UUID NOT NULL DEFAULT func.tuid_generate() UNIQUE,
  flow_name VARCHAR PRIMARY KEY
);

CREATE TABLE client.form_request
(
  form_request_id UUID NOT NULL DEFAULT func.tuid_generate() UNIQUE,
  stoken BYTEA PRIMARY KEY,
  form_key_name VARCHAR NOT NULL,
  system_name VARCHAR NOT NULL,
  CONSTRAINT form_key_fk FOREIGN KEY (form_key_name, system_name) REFERENCES client.form_key,
  brand_name VARCHAR NOT NULL REFERENCES client.brand ON DELETE RESTRICT,
  jurisdiction_name VARCHAR NOT NULL REFERENCES client.jurisdiction ON DELETE RESTRICT,
  signing_date DATE NOT NULL,
  locale_name VARCHAR NOT NULL REFERENCES client.locale,
  valid_until TIMESTAMPTZ NOT NULL,
  form_data JSONB NOT NULL,
  docusign_template_identifiers VARCHAR[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE client.docusign_mapping
(
  docusign_mapping_id UUID PRIMARY KEY,
  flow_name VARCHAR REFERENCES client.flow ON DELETE RESTRICT,
  brand_name VARCHAR REFERENCES client.brand ON DELETE RESTRICT,
  jurisdiction_name VARCHAR REFERENCES client.jurisdiction ON DELETE RESTRICT,
  locale_name VARCHAR REFERENCES client.locale ON DELETE RESTRICT,
  in_use_window DATERANGE DEFAULT '(,)'::DATERANGE,
  CONSTRAINT docusign_mapping_window_bounds
    CHECK ((LOWER_INC(in_use_window) OR (LOWER(in_use_window) IS NULL)) AND (NOT UPPER_INC(in_use_window))),
  CONSTRAINT docusign_mapping_juri_name_brand_locale_window_exclude
    EXCLUDE USING gist (jurisdiction_name WITH =, flow_name WITH =, brand_name WITH =, locale_name WITH =, in_use_window WITH &&),
  template_identifiers VARCHAR[] NOT NULL
);

------------------------------------------------------------------------------------------------------
CREATE UNLOGGED TABLE client.session
(
  session_id BYTEA DEFAULT func.stuid_generate() PRIMARY KEY,
  data JSONB DEFAULT '{}'::JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  expire_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP + '1 hour'::INTERVAL NOT NULL
);

------------------------------------------------------------------------------------------------------
CREATE TABLE staff.login
(
  login_id UUID PRIMARY KEY DEFAULT func.tuid_generate(),
  login VARCHAR NOT NULL UNIQUE,
  display_name VARCHAR NOT NULL,
  locale_name VARCHAR NOT NULL REFERENCES client.locale,
  raw_auth_response VARCHAR NOT NULL
);
SELECT staff.add_history_to_table('login');
------------------------------------------------------------------------------------------------------
CREATE TABLE staff.login_log
(
  login VARCHAR NOT NULL, -- NOT references, we want to retain the logs if login is deleted.
  at TIMESTAMPTZ DEFAULT CLOCK_TIMESTAMP() PRIMARY KEY,
  result VARCHAR NOT NULL CHECK (result IN ('+ga', '-?')),
  remote_address VARCHAR NOT NULL
);
CREATE INDEX login_log_login ON staff.login_log (login, at);

CREATE TRIGGER login_log_append_only_tg
  BEFORE DELETE OR TRUNCATE
  ON staff.login_log
EXECUTE FUNCTION func.prevent_change();
------------------------------------------------------------------------------------------------------
CREATE UNLOGGED TABLE staff.session
(
  session_id BYTEA DEFAULT stuid_generate() PRIMARY KEY,
  login VARCHAR REFERENCES staff.login (login) ON DELETE CASCADE, -- can be back filled after creation, so can be NULL
  data JSONB DEFAULT '{}'::JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  expire_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP + '1 hour'::INTERVAL NOT NULL
);
CREATE INDEX session_user_id ON staff.session (login, created_at);

------------------------------------------------------------------------------------------------------
SET search_path = staff, func;
\i ./SCHEMA/permission.sql
------------------------------------------------------------------------------------------------------
CREATE TABLE staff.login_x_permission
(
  login_x_permission_id UUID NOT NULL DEFAULT func.tuid_generate(),
  login VARCHAR NOT NULL REFERENCES staff.login (login) ON DELETE CASCADE,
  permission_name VARCHAR NOT NULL REFERENCES staff.permission,
  relation_type VARCHAR NOT NULL DEFAULT 'add' CHECK (relation_type::TEXT = ANY
                                                      (ARRAY ['add'::TEXT, 'remove'::TEXT, 'add_grant'::TEXT])),
  PRIMARY KEY (login, permission_name)
);
SELECT staff.add_history_to_table('login_x_permission');
------------------------------------------------------------------------------------------------------
CREATE TABLE staff.login_x_permission_group
(
  login_x_permission_group_id UUID NOT NULL DEFAULT func.tuid_generate(),
  login VARCHAR NOT NULL REFERENCES staff.login (login) ON DELETE CASCADE,
  permission_group_name VARCHAR NOT NULL REFERENCES staff.permission_group,
  PRIMARY KEY (login, permission_group_name)
);
SELECT staff.add_history_to_table('login_x_permission_group');
------------------------------------------------------------------------------------------------------
-- system_setting

CREATE TABLE meta.system_setting
(
  system_setting_id UUID NOT NULL DEFAULT func.tuid_generate(),
  system_setting VARCHAR PRIMARY KEY,
  value JSONB NOT NULL
);

SELECT meta.add_history_to_table('system_setting');

------------------------------------------------------------------------------------------------------
-- trigger to auto assign ivkey on session insert/update
------------------------------------------------------------------------------------------------------

CREATE FUNCTION func.session_ivkey_assign() RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER -- runs as owner
AS
$$
DECLARE
  ivkey_ BYTEA;
BEGIN
  IF new.client_profile_id IS NULL THEN
    new.ivkey = NULL;
    RETURN new;
  END IF;

  INSERT INTO staff.client_profile_1_key (client_profile_id, ivkey)
  VALUES (new.client_profile_id, func.gen_random_bytes(48))
  ON CONFLICT DO NOTHING;

  SELECT ivkey INTO ivkey_ FROM staff.client_profile_1_key WHERE client_profile_id = new.client_profile_id;
  new.ivkey = ivkey_;
  RETURN new;
END;
$$;

ALTER FUNCTION session_ivkey_assign() OWNER TO hello_staff;

CREATE TRIGGER session_ivkey_assign_tg
  BEFORE INSERT OR UPDATE
  ON client.session
  FOR EACH ROW
EXECUTE FUNCTION func.session_ivkey_assign();
------------------------------------------------------------------------------------------------------

SET "audit.user" = '_SETUP_';


------------------------------------------------------------------------------------------------------
-- base permissions
------------------------------------------------------------------------------------------------------

INSERT INTO
  staff.permission (permission_name)
VALUES
  ('ADMIN_SYSTEM_SETTINGS_UPDATE'),
  ('ADMIN_PERMISSION_CREATE'),
  ('ADMIN_PERMISSION_UPDATE'),
  ('ADMIN_PERMISSION_DELETE'),
  ('ADMIN_PERMISSION_VIEW'),
  ('ADMIN_PERMISSION_GROUP_CREATE'),
  ('ADMIN_PERMISSION_GROUP_UPDATE'),
  ('ADMIN_PERMISSION_GROUP_DELETE'),
  ('ADMIN_PERMISSION_GROUP_VIEW')
;

INSERT INTO
  staff.permission_group (permission_group_name)
VALUES
  ('ADMIN');

INSERT INTO
  staff.permission_x_permission_group (permission_group_name, permission_name, relation_type)
SELECT 'ADMIN',
  permission_name,
  'add_grant'
FROM
  staff.permission;

------------------------------------------------------------------------------------------------------
-- base system settings
------------------------------------------------------------------------------------------------------

INSERT INTO
  meta.system_setting
  (system_setting, value)
VALUES
('allowed_domains', '[
  "wealthbar.com"
]'::JSONB);

------------------------------------------------------------------------------------------------------
-- client.workorders
SET search_path = client, func;
\i ./SCHEMA/workorder.sql

------------------------------------------------------------------------------------------------------
-- staff.workorders

SET search_path = staff, func;
\i ./SCHEMA/workorder.sql

------------------------------------------------------------------------------------------------------
SET search_path = client, func;
INSERT INTO
  client.locale (locale_name)
VALUES
  ('en'),
  ('fr');

INSERT INTO
  client.jurisdiction (jurisdiction_name)
VALUES
  (''),
  ('ca'),
  ('ca_ab'),
  ('ca_bc'),
  ('ca_mb'),
  ('ca_nb'),
  ('ca_nl'),
  ('ca_ns'),
  ('ca_nt'),
  ('ca_nu'),
  ('ca_on'),
  ('ca_pe'),
  ('ca_qc'),
  ('ca_sk'),
  ('ca_yt')
;

INSERT INTO
  client.brand (brand_name)
VALUES
  ('cidi'),
  ('ac'),
  ('ciis');

------------------------------------------------------------------------------------------------------

RESET "audit.user";

------------------------------------------------------------------------------------------------------
