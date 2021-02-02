export const value = `
WITH u AS (SELECT tuid_from_compact($(userId)) AS user_id),
     pgr AS (
       SELECT permission_group_name,
              json_agg(
                json_build_object(
                  'permissionName', permission_name,
                  'relationType', relation_type
                  )
                ) AS permission_list
       FROM user_x_permission_group upg
              JOIN permission_x_permission_group ppg USING (permission_group_name)
              JOIN u USING (user_id)
       GROUP BY permission_group_name
     ),
     pg AS (
       SELECT json_agg(
                json_build_object(
                  'permissionGroupName', permission_group_name,
                  'permissionList', permission_list
                  )
                ) AS user_permission_group_list
       FROM pgr
     ),
     p AS (
       SELECT json_agg(
                json_build_object(
                  'permissionName', permission_name,
                  'relationType',
                  relation_type
                  )
                ) AS user_permission_list
       FROM user_x_permission
              JOIN u USING (user_id)
     ),
     upr AS (
       (
         SELECT permission_name,
                relation_type
         FROM user_x_permission_group upg
                JOIN permission_x_permission_group ppg USING (permission_group_name)
                JOIN u USING (user_id)
       )
       UNION ALL
       (
         SELECT permission_name, relation_type
         FROM user_x_permission
                JOIN u USING (user_id)
       )
     ),
     up AS (
       SELECT json_agg(
                json_build_object(
                  'permission_name', permission_name,
                  'relation_type', relation_type
                  )
                ) AS permission_list
       FROM upr
     )
SELECT user_permission_group_list,
       user_permission_list,
       permission_list
FROM pg,
     p,
     up;

`;
