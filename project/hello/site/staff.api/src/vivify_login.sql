WITH i_login AS (
  INSERT INTO login (login, display_name)
    VALUES ($(login), $(email))
    ON CONFLICT DO NOTHING
    RETURNING login
  ),
  i_login_log AS (
    INSERT INTO login_log (login, result, remote_address)
      VALUES ($(login), '+ga', $(remoteAddress))
      RETURNING TRUE
    )
SELECT login
FROM
  i_login,
  i_login_log;
