-- assumes pgcrypto loaded in func

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

