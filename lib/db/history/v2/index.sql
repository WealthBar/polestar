-- assumes pgcrypto loaded in func
-- assumes tuid/v4
-- assumes util/v2
-- set search path before including!

-- audit.user is used to track who did the changes
-- SET "audit.user" TO 'bob@example.com';
-- RESET "audit.user";

-- Only the delta from current state is stored.
--   Inserts fully matched the current state, so entry will be an empty hstore
--   Updates will only record columns modified from current state
--   Deletes will track the entire entry as the current state becomes "nothing"
-- tx is the transaction changes occurred in so you can collate changes that occurred across multiple tables at the same time.


CREATE TABLE
  history
(
  tx BIGINT,
  schema_name VARCHAR NOT NULL,
  table_name VARCHAR NOT NULL,
  id UUID NOT NULL,
  who VARCHAR NOT NULL,
  tz TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(), -- NOT now() or current_timestamp, we want the clock so a transaction that updates the same data twice won't hit a conflict on insert.
  op CHAR CHECK (op = ANY (ARRAY ['I' :: CHAR, 'U' :: CHAR, 'D' :: CHAR])),
  entry HSTORE,
  PRIMARY KEY (id, tz)
  -- schema_name/table_name isn't required because tuids are globally unique, tz is required as the same id can be updated multiple times in one transaction
);

CREATE INDEX history_tn_id_tz ON history (schema_name, table_name, id, tz);

CREATE TRIGGER history_prevent_change
  BEFORE UPDATE OR DELETE OR TRUNCATE
  ON history
EXECUTE PROCEDURE func.prevent_change();


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
      history (id, schema_name, table_name, tx, who, op, entry)
    VALUES (id, tg_table_schema, tg_table_name, tx, who, 'U', oldhs - newhs);
    RETURN new;
  END IF;

  IF tg_op = 'INSERT'
  THEN
    newhs = hstore(new);
    id = (newhs -> idname) :: UUID;
    -- RAISE NOTICE '%', id;
    INSERT INTO
      history (id, schema_name, table_name, tx, who, op, entry)
    VALUES (id, tg_table_schema, tg_table_name, tx, who, 'I', ''::HSTORE);
    RETURN new;
  END IF;

  IF tg_op = 'DELETE'
  THEN
    oldhs = hstore(old);
    id = (oldhs -> idname) :: UUID;
    -- RAISE NOTICE '%', id;
    INSERT INTO
      history (id, schema_name, table_name, tx, who, op, entry)
    VALUES (id, tg_table_schema, tg_table_name, tx, who, 'D', oldhs);
    RETURN old;
  END IF;

  RETURN NULL;
END;
$X$;

DO
$X$
  DECLARE
    schema_name VARCHAR;
  BEGIN
    SELECT (CURRENT_SCHEMAS(FALSE))[1] INTO schema_name;
    EXECUTE FORMAT($qq$
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
      'CREATE TRIGGER %%I
        AFTER UPDATE OR DELETE OR INSERT
        ON %I.%%I
        FOR EACH ROW EXECUTE PROCEDURE %I.history_track_tg(%%L);
      ',
      table_name || '_history',
      table_name,
      id_column_name
      );
  END;
  $$;
  $qq$, schema_name, schema_name);
  END
$X$;
