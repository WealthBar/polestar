WITH u_login AS (
  UPDATE login
    SET (n, q) = ($(n), $(q))
    WHERE login.login = $(normalizedLogin)
    RETURNING TRUE
  ),
  i_login_log AS (
    INSERT INTO login_log (login, result, remote_address)
      VALUES ($(normalizedLogin), '+pwc', $(remoteAddress))
      RETURNING TRUE
    )
SELECT client_profile_id, federated_login_id
FROM
  u_login,
  i_login_log,
  login_1_federated_login
  JOIN federated_login fl
  USING (federated_login_id)
WHERE login = $(normalizedLogin);
