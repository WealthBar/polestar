DO
$$
  DECLARE
    uid UUID;
  BEGIN
    SELECT user_id
    INTO uid
    FROM user_n_email
    WHERE email = $(email);

    IF uid IS NULL
    THEN
      INSERT INTO "user" (display_name)
      VALUES ($(displayName))
      RETURNING user_id INTO uid;

      INSERT INTO "user_n_email" (user_id, email, "primary")
      VALUES (uid, $(email), TRUE);
    END IF;
  EXCEPTION
    when others then
  END;
$$;

SELECT user_id
FROM user_n_email
WHERE email = $(email);
