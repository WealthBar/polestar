CREATE TABLE workorder
(
  workorder_id uuid NOT NULL PRIMARY KEY,
  context_name VARCHAR NOT NULL,
  current_content_hash VARCHAR NOT NULL,
  frozen_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT workorder_context_name_check CHECK (((context_name)::text ~ '^[\x20-\x7e]+$'::text))
);

CREATE UNIQUE INDEX workorder_allow_only_not_frozen ON workorder USING btree (context_name) WHERE (frozen_at IS NULL);

CREATE TABLE workorder_n_state
(
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
    encode(func.digest(workorder_id::VARCHAR || E'\n' || context_name || E'\n' || state::VARCHAR, 'sha1'), 'base64'),
    '=/+', -- unsafe in a URL param
    '.-_' -- safe in a URL param
    )
$$;

CREATE FUNCTION workorder_by_content_hash(context_name_ VARCHAR, content_hash_ VARCHAR)
  RETURNS TABLE
          (
            workorder_id uuid,
            content_hash VARCHAR,
            current_content_hash VARCHAR,
            context_name VARCHAR,
            state jsonb,
            frozen_at timestamptz
          )
  LANGUAGE sql
AS
$$
SELECT
  wo.workorder_id,
  ws.content_hash,
  wo.current_content_hash,
  wo.context_name,
  ws.state,
  wo.frozen_at as frozen_at
FROM
  workorder wo
    JOIN workorder_n_state ws USING (workorder_id)
WHERE
    ws.content_hash = content_hash_
  AND wo.context_name = context_name_
$$;

CREATE FUNCTION workorder_get_active(context_name_ VARCHAR)
  RETURNS TABLE
          (
            workorder_id uuid,
            context_name VARCHAR,
            content_hash VARCHAR,
            current_content_hash VARCHAR,
            state jsonb
          )
  LANGUAGE plpgsql
AS
$$
DECLARE
  r RECORD; -- because the return table fields become local variables we have to avoid using them in the queries
  -- and instead select into a record.
BEGIN
  SELECT *
  INTO r
  FROM
    workorder wo
  WHERE
      wo.context_name = context_name_
    AND wo.frozen_at IS NULL;

  IF r.workorder_id IS NOT NULL THEN -- an active work order already exists
  -- update the output row
    workorder_id = r.workorder_id;
    current_content_hash = r.current_content_hash;
    content_hash = r.current_content_hash;
    context_name = r.context_name;

    -- get the associated state
    SELECT
      wos.state
    INTO r
    FROM
      workorder_n_state wos
    WHERE
        wos.content_hash = current_content_hash;

    -- update the output row
    state = r.state;
    RETURN NEXT; -- return the output row
  END IF;
END;
$$;

CREATE FUNCTION workorder_get_active(context_name_ VARCHAR, default_state jsonb)
  RETURNS TABLE
          (
            workorder_id uuid,
            context_name VARCHAR,
            content_hash VARCHAR,
            current_content_hash VARCHAR,
            state jsonb
          )
  LANGUAGE plpgsql
AS
$$
DECLARE
  r RECORD; -- because the return table fields become local variables we have to avoid using them in the queries
  -- and instead select into a record.
BEGIN
  SELECT *
  INTO r
  FROM
    workorder wo
  WHERE
      wo.context_name = context_name_
    AND wo.frozen_at IS NULL;

  IF r.workorder_id IS NOT NULL THEN -- an active work order already exists
  -- update the output row
    workorder_id = r.workorder_id;
    current_content_hash = r.current_content_hash;
    content_hash = r.current_content_hash;
    context_name = r.context_name;

    -- get the associated state
    SELECT
      wos.state
    INTO r
    FROM
      workorder_n_state wos
    WHERE
        wos.content_hash = current_content_hash;

    -- update the output row
    state = r.state;
  ELSE
    -- setup the data for the new work order
    workorder_id = func.tuid_generate();
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
        SELECT *
        INTO r
        FROM
          workorder wo
        WHERE
            wo.context_name = context_name_
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
        SELECT *
        INTO r
        FROM
          workorder_n_state wos
        WHERE
            wos.content_hash = current_content_hash;

        -- update the output row
        state = r.state;
    END;
  END IF;

  RETURN NEXT; -- return the output row
END;
$$;

CREATE FUNCTION workorder_update(context_name_ VARCHAR, new_state_ jsonb)
  RETURNS TABLE
          (
            workorder_id uuid,
            context_name VARCHAR,
            content_hash VARCHAR,
            current_content_hash VARCHAR,
            state jsonb
          )
  LANGUAGE plpgsql
AS
$$
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
    VALUES
    (current_content_hash, workorder_id, new_state_)
      -- could already exist from a previous update
    ON CONFLICT DO NOTHING;

    -- set the output field
    state = new_state_;

    -- update the current content hash so resuming will now resume from here
    workorder_id_ = workorder_id;
    current_content_hash_ = current_content_hash;

    UPDATE workorder
    SET
      current_content_hash = current_content_hash_
    WHERE
        workorder.workorder_id = workorder_id_
      AND workorder.current_content_hash IS DISTINCT FROM current_content_hash_;
  END IF;

  RETURN NEXT; -- return the data
END;
$$;

CREATE FUNCTION workorder_update(context_name_ VARCHAR, original_content_hash_ VARCHAR, new_state_ jsonb)
  RETURNS TABLE
          (
            workorder_id uuid,
            context_name VARCHAR,
            content_hash VARCHAR,
            current_content_hash VARCHAR,
            state jsonb,
            updated boolean
          )
  LANGUAGE plpgsql
AS
$$
DECLARE
  r RECORD;
  workorder_id_ UUID;
  current_content_hash_ VARCHAR;
BEGIN
  -- set the output field
  context_name = context_name_;
  updated = false;

  SELECT *
  INTO r
  FROM
    workorder_get_active(context_name_);

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
    VALUES
    (current_content_hash, workorder_id, new_state_)
      -- might match an previously existing state, which is fine.
    ON CONFLICT DO NOTHING;

    -- set the output field
    state = new_state_;

    -- update the current content hash of the work flow
    workorder_id_ = workorder_id;
    current_content_hash_ = current_content_hash;
    UPDATE workorder wo
    SET
      current_content_hash = current_content_hash_
    WHERE
        wo.workorder_id = workorder_id_
      AND wo.current_content_hash IS DISTINCT FROM current_content_hash_;
  END IF;
  -- updated here really means the state matches what the request to make it provided
  -- even if that technically doesn't change it.
  updated = true;
  RETURN NEXT;
END;
$$;

CREATE FUNCTION workorder_freeze(context_name_ VARCHAR, original_content_hash_ VARCHAR)
  RETURNS TABLE
          (
            workorder_id uuid,
            context_name VARCHAR,
            content_hash VARCHAR,
            current_content_hash VARCHAR,
            state jsonb,
            frozen_at timestamp with time zone
          )
  LANGUAGE plpgsql
AS
$$
DECLARE
  r RECORD;
  u RECORD;
  workorder_id_ UUID;
BEGIN
  -- set the output field
  context_name = context_name_;
  content_hash = original_content_hash_;

  SELECT *
  INTO r
  FROM
    workorder_get_active(context_name_);
  workorder_id = r.workorder_id;

  -- set the output field
  current_content_hash = r.current_content_hash;
  state = r.state;

  IF r.current_content_hash = original_content_hash_ THEN
    -- only freeze the work order if it hasn't changed since we last looked at it.
    workorder_id_ = workorder_id;

    UPDATE workorder wo
    SET
      frozen_at = now()
    WHERE
        wo.workorder_id = workorder_id_
      AND wo.current_content_hash = original_content_hash_
    RETURNING wo.frozen_at INTO u;

    -- frozen_at will only be non null if we actually froze the work order
    frozen_at = u.frozen_at;
  END IF;

  RETURN NEXT; -- return the row
END;
$$;
