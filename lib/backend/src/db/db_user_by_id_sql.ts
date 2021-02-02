export const value = `
SELECT
  u.user_id,
  u.display_name,
  ue.email
FROM "user" u LEFT OUTER JOIN user_n_email ue ON ue.user_id = u.user_id AND ue.primary
WHERE u.user_id = $(userId);

`;
