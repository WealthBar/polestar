export const value = `
(
  SELECT permission_name,
         relation_type
  FROM user_x_permission_group upg
         JOIN permission_x_permission_group ppg USING (permission_group_name)
  WHERE upg.user_id = $(userId)
)
UNION ALL
(
  SELECT permission_name, relation_type FROM user_x_permission WHERE user_id = $(userId)
);

`;
