export const value = `
WITH sys AS (
  SELECT bearer_token FROM client.system WHERE bearer_token = $(bearerToken)
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
SELECT EXISTS(
  (
    SELECT 1
    FROM
      sys,
      i_al
    )
  ) AS r;

`;
