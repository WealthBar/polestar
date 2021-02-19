WITH i_login AS (
  INSERT INTO login (login, display_name, n, q)
    VALUES ($(login), $(login), $(n), $(q))
    RETURNING TRUE
  ),
  cp AS (
    INSERT INTO client_profile (entity_type, locale, partner_channel_name)
      VALUES ('person', $(locale), $(partnerChannel))
      RETURNING client_profile_id
    ),
  fed AS (
    INSERT INTO federated_login (client_profile_id)
      SELECT client_profile_id FROM cp
      RETURNING federated_login_id
    ),
  i_l_1_fl AS (
    INSERT INTO login_1_federated_login (login, federated_login_id)
      SELECT $(login), federated_login_id FROM fed
      RETURNING TRUE
    ),
  i_cp_n_e AS (
    INSERT INTO client_profile_n_email (client_profile_id, email)
      SELECT client_profile_id, $(login) FROM cp
      RETURNING TRUE
    ),
  i_cp_1_pe AS (
    INSERT INTO client_profile_1_primary_email (client_profile_id, primary_email)
      SELECT client_profile_id, $(login) FROM cp
      RETURNING TRUE
    ),
  i_cp_x_fed AS (
    INSERT INTO client_profile_x_federated_login (client_profile_id, federated_login_id)
      SELECT client_profile_id, federated_login_id
      FROM
        cp,
        fed
      RETURNING TRUE
    ),
  i_cp_x_pg AS (
    INSERT INTO client_profile_x_permission_group (client_profile_id, permission_group_name)
      SELECT client_profile_id, 'STANDARD' FROM cp
      RETURNING TRUE
    ),
  i_login_log AS (
    INSERT INTO login_log (login, result, remote_address)
      VALUES ($(login), '+ac', $(remoteAddress))
      RETURNING TRUE
    )
SELECT client_profile_id, federated_login_id
FROM
  cp,
  fed,
  i_login,
  i_l_1_fl,
  i_cp_n_e,
  i_cp_1_pe,
  i_cp_x_fed,
  i_cp_x_pg,
  i_login_log;
