SET "audit.user" = "_DEMO_SETUP_";

DO
$$
  DECLARE
    admin_login VARCHAR;
  BEGIN
    SELECT login INTO admin_login FROM login LIMIT 1;
    -- make the first user of the system the admin

    IF admin_login IS NULL THEN
      admin_login = 'tanglebones@gmail.com';
      INSERT INTO login (login) VALUES (admin_login) ON CONFLICT DO NOTHING;
    END IF;

    INSERT INTO login_x_permission_group (login, permission_group_name)
    VALUES (admin_login, 'ADMIN')
    ON CONFLICT DO NOTHING;
  END
$$;

RESET "audit.user";
