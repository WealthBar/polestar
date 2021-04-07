-- assumes func schema exists

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
