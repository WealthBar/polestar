SET "audit.user" = "_DEMO_SETUP_";

DO
$$
    DECLARE
        admin_user_id UUID;
    BEGIN
        SELECT user_id INTO admin_user_id FROM "user" ORDER BY user_id LIMIT 1;
        -- make the first user of the system the admin

        IF admin_user_id IS NULL THEN
            admin_user_id = UUID '00058dd1-afb5-42c2-9dfa-01ffa48196f1';
            INSERT INTO "user" (user_id, display_name) VALUES (admin_user_id, 'tanglebones@gmail.com') ON CONFLICT DO NOTHING;
        END IF;

        INSERT INTO user_x_permission_group (user_id, permission_group_name)
        VALUES (admin_user_id, 'ADMIN_ALL')
        ON CONFLICT DO NOTHING;

        INSERT INTO user_x_permission (user_id, permission_name, relation_type)
        SELECT admin_user_id, permission_name, 'add_grant'
        FROM permission
        ON CONFLICT DO NOTHING;
    END
$$;

RESET "audit.user";
