WITH i_login AS (
  INSERT INTO login (login, display_name, locale, raw_auth_response)
    VALUES ($(login), $(email), $(locale), $(rawAuthResponse))
    ON CONFLICT (login)
    DO NOTHING
    RETURNING TRUE
  ),
  i_login_log AS (
    INSERT INTO login_log (login, result, remote_address)
      VALUES ($(login), '+ga', $(remoteAddress))
      RETURNING TRUE
    )
SELECT TRUE
FROM
  i_login,
  i_login_log;
