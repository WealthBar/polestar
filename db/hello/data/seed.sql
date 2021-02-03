-- some conventions:
-- tables are singular
-- id's are always prefixed by the table name (even in the table itself) to enable USING
-- a_1_b is an optional attribute table (one or zero b per a)
-- a_e_b is an extension table (exactly one b per a, PITA to handle case)
-- a_n_b is a detail table (many b per a)
-- a_x_b is an xref table (many b to many b)


set search_path = func;

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

  r0 := get_byte(r, 0);
  r1 := (get_byte(r, 1) << 8) | get_byte(r, 2);

  -- The & mask here is to suppress the sign extension on the 32nd bit.
  r2 :=
      ((get_byte(r, 3) << 24) | (get_byte(r, 4) << 16) | (get_byte(r, 5) << 8) | get_byte(r, 6)) & x'0FFFFFFFF'::BIGINT;

  ct := extract(EPOCH FROM clock_timestamp() AT TIME ZONE 'utc') * 1000000;

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

  return ret :: UUID;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION func.tuid_tz(tuid UUID)
  RETURNS timestamptz
  LANGUAGE sql
AS
$$
WITH t AS (select tuid::varchar as x)
SELECT (
                 'x'
                 || substr(t.x, 1, 8) -- xxxxxxxx-0000-4000-8000-000000000000
               || substr(t.x, 10, 4) -- 00000000-xxxx-4000-8000-000000000000
             || substr(t.x, 16, 3) -- 00000000-0000-4xxx-8000-000000000000
           || substr(t.x, 21, 1) -- 00000000-0000-4000-8x00-000000000000
         )::bit(64)::bigint * interval '1 microsecond' + timestamptz 'epoch'
FROM t;
$$;

CREATE FUNCTION func.tuid_to_compact(tuid UUID)
  RETURNS VARCHAR
  LANGUAGE sql
AS
$$
SELECT replace(translate(encode(decode(replace(tuid::TEXT, '-', ''), 'hex'), 'base64'), '/+', '-_'), '=', '');
$$;

CREATE FUNCTION func.tuid_from_compact(compact VARCHAR)
  RETURNS UUID
  LANGUAGE sql
AS
$$
SELECT encode(decode(rpad(translate(compact, '-_', '/+'), 24, '='), 'base64'), 'hex')::UUID;
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
  ct := extract(EPOCH FROM clock_timestamp() AT TIME ZONE 'utc') * 1000000;
  ret := decode(LPAD(TO_HEX(ct), 16, '0'), 'hex') || gen_random_bytes(24);
  RETURN ret;
END;
$$;


CREATE FUNCTION func.stuid_tz(stuid varchar)
  RETURNS timestamptz
  LANGUAGE sql
AS
$$
SELECT ('x' || substr(stuid, 1, 16))::bit(64)::bigint * interval '1 microsecond' + timestamptz 'epoch';
$$;

CREATE FUNCTION func.tuid_zero()
  RETURNS UUID
  IMMUTABLE
  LANGUAGE sql AS
'SELECT ''00000000-0000-0000-0000-000000000000'' :: UUID';

CREATE FUNCTION func.max(uuid, uuid)
  RETURNS uuid AS
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

CREATE AGGREGATE func.max (uuid)
  (
  sfunc = max,
  stype = uuid
  );

CREATE FUNCTION func.min(uuid, uuid)
  RETURNS uuid AS
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

CREATE AGGREGATE func.min (uuid)
  (
  sfunc = min,
  stype = uuid
  );

CREATE FUNCTION func.prevent_change()
  RETURNS TRIGGER
  LANGUAGE plpgsql
AS
$$
BEGIN
  RAISE EXCEPTION 'Records in table % cannot be %d', tg_table_name, lower(tg_op);
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
  tz TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(), -- NOT now() or current_timestamp, we want the clock so a transaction that updates the same data twice won't hit a conflict on insert.
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
  SELECT current_setting('audit.user')
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
  tz TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(), -- NOT now() or current_timestamp, we want the clock so a transaction that updates the same data twice won't hit a conflict on insert.
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
  SELECT current_setting('audit.user')
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
  tz TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(), -- NOT now() or current_timestamp, we want the clock so a transaction that updates the same data twice won't hit a conflict on insert.
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
  SELECT current_setting('audit.user')
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
  SELECT array_agg(column_name :: VARCHAR)
  INTO columns
  FROM information_schema.columns c
  WHERE c.table_schema = schema_n
    AND c.table_name = table_n;

  SELECT array_agg(a.attname)
  INTO primary_key_columns
  FROM pg_index x
         JOIN pg_class c ON c.oid = x.indrelid
         JOIN pg_class i ON i.oid = x.indexrelid
         LEFT JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY (x.indkey)
         LEFT JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE ((c.relkind = ANY (ARRAY ['r'::char, 'm'::char])) AND (i.relkind = 'i'::char))
    AND x.indisprimary
    AND n.nspname = schema_n
    AND c.relname = table_n;

  SELECT array_agg(v)
  INTO distinct_columns
  FROM unnest(columns) a(v)
  WHERE v != ALL (primary_key_columns);

  SELECT array_to_string(array_agg(FORMAT(
    '%I %s',
    v || '_',
    trim(LEADING '_' FROM c.udt_name) || CASE c.data_type WHEN 'ARRAY' THEN '[]' ELSE '' END
    )), ', ')
  INTO params_decl_literal
  FROM unnest(columns) a(v)
         JOIN information_schema.columns c
              ON c.table_name = table_n AND c.table_schema = schema_n AND c.column_name = v;

  SELECT array_to_string(array_agg(FORMAT('%I', v || '_')), ', ')
  INTO params_literal
  FROM unnest(columns) a(v);

  SELECT array_to_string(array_agg(FORMAT('%I', v)), ', ')
  INTO upsert_columns_literal
  FROM unnest(columns) a(v);

  SELECT array_to_string(array_agg(FORMAT('%I', v)), ', ')
  INTO primary_key_columns_literal
  FROM unnest(primary_key_columns) a(v);

  do_sql = 'DO NOTHING';

  IF cardinality(distinct_columns) > 0 THEN
    SELECT array_to_string(array_agg(FORMAT('%I = %I', v, v || '_')), ', ')
    INTO distinct_columns_set_literal
    FROM unnest(distinct_columns) a(v);

    SELECT array_to_string(array_agg(FORMAT('%I.%I', table_n, v)), ', ')
    INTO distinct_table_columns_literal
    FROM unnest(distinct_columns) a(v);

    SELECT array_to_string(array_agg(FORMAT('excluded.%I', v)), ', ')
    INTO distinct_excluded_columns_literal
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
  SELECT array_agg(column_name :: VARCHAR)
  INTO columns
  FROM information_schema.columns c
  WHERE c.table_schema = schema_n
    AND c.table_name = table_n;

  SELECT count(i.relname)
  INTO unique_index_count
  FROM pg_index x
         JOIN pg_class c ON c.oid = x.indrelid
         JOIN pg_class i ON i.oid = x.indexrelid
         LEFT JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE ((c.relkind = ANY (ARRAY ['r'::char, 'm'::char])) AND (i.relkind = 'i'::char))
    AND x.indisunique
    AND NOT x.indisprimary
    AND n.nspname = schema_n
    AND c.relname = table_n;

  IF unique_index_count != 1 THEN
    RAISE EXCEPTION '% unique indexes, expected exactly 1', unique_index_count;
  END IF;

  SELECT array_agg(a.attname)
  INTO primary_key_columns
  FROM pg_index x
         JOIN pg_class c ON c.oid = x.indrelid
         JOIN pg_class i ON i.oid = x.indexrelid
         LEFT JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY (x.indkey)
         LEFT JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE ((c.relkind = ANY (ARRAY ['r'::char, 'm'::char])) AND (i.relkind = 'i'::char))
    AND x.indisprimary
    AND n.nspname = schema_n
    AND c.relname = table_n;

  SELECT array_agg(a.attname)
  INTO unique_index_columns
  FROM pg_index x
         JOIN pg_class c ON c.oid = x.indrelid
         JOIN pg_class i ON i.oid = x.indexrelid
         LEFT JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY (x.indkey)
         LEFT JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE ((c.relkind = ANY (ARRAY ['r'::char, 'm'::char])) AND (i.relkind = 'i'::char))
    AND NOT x.indisprimary
    AND x.indisunique
    AND n.nspname = schema_n
    AND c.relname = table_n;

  SELECT array_agg(v)
  INTO upsert_columns
  FROM unnest(columns) a(v)
  WHERE v != ALL (primary_key_columns);

  SELECT array_agg(v)
  INTO distinct_columns
  FROM unnest(upsert_columns) a(v)
  WHERE v != ALL (unique_index_columns);

  SELECT array_to_string(array_agg(FORMAT(
    '%I %s',
    v || '_',
    trim(LEADING '_' FROM c.udt_name) || CASE c.data_type WHEN 'ARRAY' THEN '[]' ELSE '' END
    )), ', ')
  INTO params_decl_literal
  FROM unnest(upsert_columns) a(v)
         JOIN information_schema.columns c
              ON c.table_name = table_n AND c.table_schema = schema_n AND c.column_name = v;

  SELECT array_to_string(array_agg(FORMAT('%I', v || '_')), ', ')
  INTO params_literal
  FROM unnest(upsert_columns) a(v);

  SELECT array_to_string(array_agg(FORMAT('%I', v)), ', ')
  INTO upsert_columns_literal
  FROM unnest(upsert_columns) a(v);

  SELECT array_to_string(array_agg(FORMAT('%I', v)), ', ')
  INTO unique_index_columns_literal
  FROM unnest(unique_index_columns) a(v);

  do_sql = 'DO NOTHING';

  IF cardinality(distinct_columns) > 0 THEN
    SELECT array_to_string(array_agg(FORMAT('%I = %I', v, v || '_')), ', ')
    INTO distinct_columns_set_literal
    FROM unnest(distinct_columns) a(v);

    SELECT array_to_string(array_agg(FORMAT('%I.%I', table_n, v)), ', ')
    INTO distinct_table_columns_literal
    FROM unnest(distinct_columns) a(v);

    SELECT array_to_string(array_agg(FORMAT('excluded.%I', v)), ', ')
    INTO distinct_excluded_columns_literal
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

CREATE OR REPLACE FUNCTION func.create_upsert(schema_n VARCHAR, table_n VARCHAR)
  RETURNS VOID
  LANGUAGE plpgsql
AS
$$
DECLARE
  unique_index_count NUMERIC;
BEGIN
  SELECT count(i.relname)
  INTO unique_index_count
  FROM pg_index x
         JOIN pg_class c ON c.oid = x.indrelid
         JOIN pg_class i ON i.oid = x.indexrelid
         LEFT JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE ((c.relkind = ANY (ARRAY ['r'::char, 'm'::char])) AND (i.relkind = 'i'::char))
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

CREATE FUNCTION func.aes_encrypt(ivkey bytea, what TEXT)
  RETURNS BYTEA
  LANGUAGE sql
AS
$$
SELECT encrypt_iv(
  decode(what, 'escape'),
  substring(ivkey::bytea, 1, 32),
  substring(ivkey::bytea, 33, 16),
  'AES'
  )
$$;

CREATE FUNCTION func.aes_encrypt(ivkey bytea, what numeric)
  RETURNS BYTEA
  LANGUAGE sql
AS
$$
SELECT encrypt_iv(
  decode(what::text, 'escape'),
  substring(ivkey::bytea, 1, 32),
  substring(ivkey::bytea, 33, 16),
  'AES'
  )
$$;

CREATE FUNCTION func.aes_decrypt_to_text(ivkey bytea, what bytea)
  RETURNS TEXT
  LANGUAGE sql
AS
$$
SELECT encode(
  decrypt_iv(
    what,
    substring(ivkey::bytea, 1, 32),
    substring(ivkey::bytea, 33, 16),
    'AES'
    ),
  'escape')
$$;

CREATE FUNCTION func.aes_decrypt_to_numeric(ivkey bytea, what bytea)
  RETURNS numeric
  LANGUAGE sql
AS
$$
SELECT encode(
  decrypt_iv(
    what,
    substring(ivkey::bytea, 1, 32),
    substring(ivkey::bytea, 33, 16),
    'AES'
    ),
  'escape') :: numeric
$$;

------------------------------------------------------------------------------------------------------
CREATE TABLE meta.migration
(
  migration_identifier VARCHAR NOT NULL PRIMARY KEY,
  apply_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
------------------------------------------------------------------------------------------------------
CREATE TABLE client.partner_channel
(
  partner_channel_name VARCHAR NOT NULL PRIMARY KEY CHECK (partner_channel_name::text ~ '^[A-Z][_A-Z0-9]+$'),
  fallback_partner_channel_name VARCHAR DEFAULT NULL REFERENCES client.partner_channel ON DELETE RESTRICT
);
SELECT client.add_history_to_table('partner_channel');
------------------------------------------------------------------------------------------------------
CREATE TABLE client.system
(
  system_name varchar primary key CHECK (system_name::text ~ '^[A-Z][_A-Z0-9]+$'),
  default_partner_channel_name varchar NOT NULL REFERENCES client.partner_channel ON DELETE RESTRICT
);
SELECT client.add_history_to_table('system');
------------------------------------------------------------------------------------------------------
CREATE TABLE client.client_profile
(
  client_profile_id uuid DEFAULT func.tuid_generate() primary key,
  entity_type varchar not null check (entity_type IN ('person', 'company')),
  partner_channel_name varchar not null references client.partner_channel ON DELETE RESTRICT
);

CREATE FUNCTION func.prevent_changing_entity_type()
  RETURNS trigger
  language plpgsql
as
$$
BEGIN
  if old.entity_type != new.entity_type then
    raise exception 'Can not change entity_type';
  end if;
  return new;
end;
$$;

create trigger client_profile_prevent_change_entity_type_tg
  before update
  on client.client_profile
execute function func.prevent_changing_entity_type();
------------------------------------------------------------------------------------------------------
CREATE TABLE client.federated_login
(
  federated_login_id uuid DEFAULT func.tuid_generate() primary key,
  client_profile_id uuid references client.client_profile -- default to use if set
);
SELECT client.add_history_to_table('federated_login');
------------------------------------------------------------------------------------------------------
CREATE TABLE client.federated_login_x_system
(
  federated_login_id uuid references client.federated_login ON DELETE cascade,
  system_name varchar not null references client.system ON DELETE RESTRICT,
  identifier varchar not null,
  primary key (federated_login_id, system_name),
  unique (system_name, identifier)
);
SELECT client.add_history_to_table('federated_login_x_system');
------------------------------------------------------------------------------------------------------
CREATE TABLE client.login_n_federated_login
(
  login varchar not null primary key,
  federated_login_id uuid not null references client.federated_login ON DELETE cascade,
  pwcrypted varchar not null, -- crypt compatible format, e.g. $2a$06$...
  mfa varchar not null default 'none' check (mfa in ('none', 'sms', 'app')),
  mfa_key varchar,
  mfa_sms_number varchar
);
SELECT client.add_history_to_table('login_n_federated_login');
------------------------------------------------------------------------------------------------------
CREATE TABLE client.client_profile_x_federated_login
(
  federated_login_id uuid not null references client.federated_login ON DELETE cascade,
  client_profile_id uuid not null references client.client_profile ON DELETE cascade,
  primary key (federated_login_id, client_profile_id)
);
SELECT client.add_history_to_table('client_profile_x_federated_login');
------------------------------------------------------------------------------------------------------
CREATE TABLE client.login_log
(
  login varchar not null references client.login_n_federated_login,
  at timestamptz default clock_timestamp() PRIMARY KEY,
  result varchar not null check (result in ('-pw', '+pw', '-oauth', '+oauth', '-mfa', '+mfa')),
  remote_address varchar not null
);
CREATE INDEX login_log_login ON client.login_log (login, at);

CREATE trigger login_log_append_only_tg
  BEFORE DELETE OR TRUNCATE
  on client.login_log
execute function func.prevent_change();
------------------------------------------------------------------------------------------------------
CREATE TABLE client.login_1_signup_data
(
  login varchar primary key,
  -- encrypted
  signup_data bytea not null -- varchar
);
SELECT client.add_history_to_table('login_1_signup_data');
------------------------------------------------------------------------------------------------------
CREATE TABLE client.client_profile_n_email
(
  client_profile_id uuid not null references client.client_profile ON DELETE cascade,
  email varchar not null,
  verification_code varchar not null,
  verified_at timestamptz,
  primary key (client_profile_id, email)
);
SELECT client.add_history_to_table('client_profile_n_email');
------------------------------------------------------------------------------------------------------
CREATE TABLE client.client_profile_1_primary_email
(
  client_profile_id uuid not null,
  primary_email varchar not null,
  verification_code varchar not null default stuid_generate(),
  foreign key (client_profile_id, primary_email) references client.client_profile_n_email (client_profile_id, email) ON DELETE cascade,
  primary key (client_profile_id, primary_email)
);
SELECT client.add_history_to_table('client_profile_1_primary_email');
------------------------------------------------------------------------------------------------------
CREATE TABLE client.client_profile_1_person
(
  client_profile_id uuid primary key references client.client_profile ON DELETE cascade,
  first_name varchar not null,
  middle_name varchar not null default '',
  last_name varchar not null
);
SELECT client.add_history_to_table('client_profile_1_person');
------------------------------------------------------------------------------------------------------
CREATE TABLE client.client_profile_1_company
(
  client_profile_id uuid primary key references client.client_profile ON DELETE cascade,
  company_name varchar not null
);
SELECT client.add_history_to_table('client_profile_1_company');
------------------------------------------------------------------------------------------------------
CREATE TABLE client.client_profile_n_address
(
  client_profile_id uuid references client.client_profile ON DELETE cascade,
  kind varchar not null check (kind IN ('primary', 'mailing', 'employer')),
  primary key (client_profile_id, kind),
  -- encrypted
  address_line1 bytea not null, -- varchar
  address_line2 bytea,          -- varchar
  city bytea not null,          -- city
  region bytea,                 -- region
  country bytea not null,       -- country
  postal_code bytea             -- postal_code
);
SELECT client.add_history_to_table('client_profile_n_address');
------------------------------------------------------------------------------------------------------
CREATE TABLE client.client_profile_n_phone
(
  client_profile_id uuid references client.client_profile ON DELETE cascade,
  kind varchar not null check (kind in ('primary', 'secondary', 'mobile', 'employer')),
  primary key (client_profile_id, kind),
  -- encrypted
  phone bytea not null -- varchar
);
SELECT client.add_history_to_table('client_profile_n_phone');
------------------------------------------------------------------------------------------------------
CREATE TABLE staff.client_profile_1_key
(
  client_profile_id uuid not null references client.client_profile ON DELETE cascade,
  ivkey bytea not null
);
SELECT staff.add_history_to_table('client_profile_1_key');
------------------------------------------------------------------------------------------------------
CREATE MATERIALIZED VIEW staff.client_profile_n_phone AS
SELECT client_profile_id,
  kind,
  func.aes_decrypt_to_text(ivkey, phone) as phone
FROM client.client_profile_n_phone
       JOIN staff.client_profile_1_key using (client_profile_id);

CREATE INDEX client_profile_n_phone_phone ON staff.client_profile_n_phone (phone);
------------------------------------------------------------------------------------------------------
CREATE TABLE staff.login
(
  login_id UUID NOT NULL DEFAULT tuid_generate(),
  login varchar primary key
);
SELECT staff.add_history_to_table('login');
------------------------------------------------------------------------------------------------------
CREATE TABLE staff.login_log
(
  login varchar not null references staff.login,
  at timestamptz default clock_timestamp() primary key,
  result varchar not null check (result in ('-oauth', '+oauth')),
  remote_address varchar not null
);
CREATE INDEX login_log_login ON staff.login_log (login, at);

CREATE trigger login_log_append_only_tg
  BEFORE DELETE OR TRUNCATE
  on staff.login_log
execute function func.prevent_change();
------------------------------------------------------------------------------------------------------
CREATE UNLOGGED TABLE client.session
(
  session_id bytea DEFAULT stuid_generate() PRIMARY KEY,
  federated_login_id UUID references client.federated_login ON DELETE cascade, -- can be back filled after creation, so can be NULL
  client_profile_id UUID references client.client_profile ON DELETE cascade,   -- can be back filled after creation, so can be NULL
  data JSONB DEFAULT '{}'::JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT current_timestamp NOT NULL,
  expire_at TIMESTAMPTZ DEFAULT current_timestamp + '1 hour'::INTERVAL NOT NULL,
  CHECK ((federated_login_id IS NOT NULL AND client_profile_id IS NOT NULL) OR
         (federated_login_id IS NULL AND client_profile_id IS NULL))           -- both null, or both set.
);
CREATE INDEX session_user_id ON client.session (federated_login_id, created_at);
------------------------------------------------------------------------------------------------------
CREATE UNLOGGED TABLE staff.session
(
  session_id bytea DEFAULT stuid_generate() PRIMARY KEY,
  login varchar references staff.login ON DELETE cascade, -- can be back filled after creation, so can be NULL
  data JSONB DEFAULT '{}'::JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT current_timestamp NOT NULL,
  expire_at TIMESTAMPTZ DEFAULT current_timestamp + '1 hour'::INTERVAL NOT NULL
);
CREATE INDEX session_user_id ON staff.session (login, created_at);

------------------------------------------------------------------------------------------------------
set search_path = client, func;
\i ./data/permission.sql
------------------------------------------------------------------------------------------------------
CREATE TABLE client.client_profile_x_permission
(
  client_profile_x_permission_id UUID NOT NULL DEFAULT func.tuid_generate(),
  client_profile_id UUID NOT NULL REFERENCES client.client_profile,
  permission_name VARCHAR NOT NULL REFERENCES client.permission,
  relation_type VARCHAR NOT NULL DEFAULT 'add' CHECK (relation_type::text = ANY
                                                      (ARRAY ['add'::text, 'remove'::text, 'add_grant'::text])),
  PRIMARY KEY (client_profile_id, permission_name)
);
SELECT client.add_history_to_table('client_profile_x_permission');
------------------------------------------------------------------------------------------------------
CREATE TABLE client.client_profile_x_permission_group
(
  client_profile_x_permission_group_id UUID NOT NULL DEFAULT func.tuid_generate(),
  client_profile_id UUID NOT NULL REFERENCES client.client_profile,
  permission_group_name VARCHAR NOT NULL REFERENCES client.permission_group,
  PRIMARY KEY (client_profile_id, permission_group_name)
);
SELECT client.add_history_to_table('client_profile_x_permission_group');
------------------------------------------------------------------------------------------------------
set search_path = staff, func;
\i ./data/permission.sql
------------------------------------------------------------------------------------------------------
CREATE TABLE staff.login_x_permission
(
  login_x_permission_id UUID NOT NULL DEFAULT func.tuid_generate(),
  login varchar NOT NULL REFERENCES staff.login,
  permission_name VARCHAR NOT NULL REFERENCES staff.permission,
  relation_type VARCHAR NOT NULL DEFAULT 'add' CHECK (relation_type::text = ANY
                                                      (ARRAY ['add'::text, 'remove'::text, 'add_grant'::text])),
  PRIMARY KEY (login, permission_name)
);
SELECT staff.add_history_to_table('login_x_permission');
------------------------------------------------------------------------------------------------------
CREATE TABLE staff.login_x_permission_group
(
  login_x_permission_group_id UUID NOT NULL DEFAULT func.tuid_generate(),
  login varchar NOT NULL REFERENCES staff.login,
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
FROM staff.permission;


INSERT INTO
  client.permission (permission_name)
VALUES
  ('LOGIN')
;

INSERT INTO
  client.permission_group (permission_group_name)
VALUES
  ('STANDARD');

INSERT INTO
  client.permission_x_permission_group (permission_group_name, permission_name, relation_type)
SELECT 'STANDARD',
  permission_name,
  'add'
FROM client.permission;

------------------------------------------------------------------------------------------------------
-- base system settings
------------------------------------------------------------------------------------------------------

INSERT INTO
  meta.system_setting
  (system_setting, value)
VALUES
('allowed_domains', '[
  "wealthbar.com"
]'::jsonb);

------------------------------------------------------------------------------------------------------
-- client.workorders
set search_path = client, func;
\i ./data/workorder.sql

------------------------------------------------------------------------------------------------------
-- staff.workorders

set search_path = staff, func;
\i ./data/workorder.sql

------------------------------------------------------------------------------------------------------

reset "audit.user";

------------------------------------------------------------------------------------------------------
