export const value = `
WITH i_ll AS (
  INSERT INTO
    login_log (login, result, remote_address)
    VALUES
      ($(login), $(result), $(remoteAddress))
    RETURNING TRUE
  )
SELECT federated_login_id
     , client_profile_id
FROM
  login_1_federated_login
  JOIN federated_login
  USING (federated_login_id),
  i_ll
WHERE login = $(login);

`;
