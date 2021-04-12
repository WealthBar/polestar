export const value = `
WITH sys AS (
  SELECT *
  FROM
    client.system
  WHERE bearer_token = $(bearerToken)
  ),
  i_al AS (
    INSERT INTO client.access_log
      (bearer_token, result, remote_address)
      VALUES
      ($(bearerToken),
       CASE
         WHEN EXISTS(
           (
             SELECT 1
             FROM
               sys
             )
           ) THEN '+'
         ELSE '-'
         END,
       $(remoteAddress))
      RETURNING TRUE
    )
SELECT system_id,
  system_name,
  domain,
  ENCODE(secret_key, 'hex') AS secret_key,
  error_url
FROM
  sys,
  i_al
;

`;
