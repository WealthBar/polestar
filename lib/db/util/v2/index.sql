-- assumes func schema exists

CREATE OR REPLACE FUNCTION func.raise_exception(what VARCHAR)
  RETURNS VOID AS
$$
BEGIN
  RAISE EXCEPTION '%', what;
END
$$ LANGUAGE plpgsql;

CREATE FUNCTION func.prevent_change()
  RETURNS TRIGGER
  LANGUAGE plpgsql
AS
$$
BEGIN
  RAISE EXCEPTION 'Records in table % cannot be %d', tg_table_name, LOWER(tg_op);
END;
$$;

create function func.tz_to_iso(tz timestamp with time zone) returns character varying
  language sql
as
$$
SELECT to_char(tz, 'YYYY-MM-DD"T"HH24:mi:ssZ')
$$;
