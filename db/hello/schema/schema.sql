-- some conventions:
-- tables are singular
-- id's are always prefixed by the table name (even in the table itself) to enable USING
-- a_1_b is an optional attribute table (one or zero b per a)
-- a_e_b is an extension table (exactly one b per a, PITA to handle case)
-- a_n_b is a detail table (many b per a)
-- a_x_b is an xref table (many b to many b)

SET search_path = func;
\i ../../lib/db/util/v2/INDEX.sql
\i ../../lib/db/tuid/v4/INDEX.sql
\i ../../lib/db/upsert/v2/INDEX.sql
\i ../../lib/db/encrypt/v2/INDEX.sql

SET "audit.user" TO 'SETUP';

SET search_path = meta, func;
\i ../../lib/db/history/v2/INDEX.sql
SET search_path = staff, func;
\i ../../lib/db/history/v2/INDEX.sql
SET search_path = client, func;
\i ../../lib/db/history/v2/INDEX.sql

SET search_path = func;

------------------------------------------------------------------------------------------------------
CREATE TABLE meta.migration
(
  migration_identifier VARCHAR NOT NULL PRIMARY KEY,
  apply_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
------------------------------------------------------------------------------------------------------
CREATE TABLE client.partner_channel
(
  partner_channel_name VARCHAR NOT NULL PRIMARY KEY CHECK (partner_channel_name::TEXT ~ '^([A-Z][_A-Z0-9]+|)$'),
  fallback_partner_channel_name VARCHAR DEFAULT NULL REFERENCES client.partner_channel
);

CREATE TRIGGER client_partner_channel_append_only
  BEFORE UPDATE OR DELETE OR TRUNCATE
  ON client.partner_channel
EXECUTE FUNCTION func.prevent_change();
------------------------------------------------------------------------------------------------------
CREATE TABLE client.system
(
  system_id UUID PRIMARY KEY DEFAULT tuid_generate(),
  system_name VARCHAR UNIQUE CHECK (system_name::TEXT ~ '^[A-Z][_A-Z0-9]+$'),
  default_partner_channel_name VARCHAR NOT NULL REFERENCES client.partner_channel ON DELETE RESTRICT
);
SELECT client.add_history_to_table('system');
------------------------------------------------------------------------------------------------------
CREATE TABLE client.region
(
  region_name VARCHAR NOT NULL PRIMARY KEY
  -- e.g. ca_bc, ca_ab, ...
);
------------------------------------------------------------------------------------------------------
CREATE TABLE client.client_profile
(
  client_profile_id UUID DEFAULT func.tuid_generate() PRIMARY KEY,
  entity_type VARCHAR NOT NULL CHECK (entity_type IN ('person', 'company')),
  partner_channel_name VARCHAR NOT NULL REFERENCES client.partner_channel ON DELETE RESTRICT,
  locale VARCHAR NOT NULL DEFAULT 'en' CHECK ( locale IN ('en', 'fr')),
  region VARCHAR REFERENCES client.region
);

CREATE FUNCTION func.prevent_changing_entity_type()
  RETURNS TRIGGER
  LANGUAGE plpgsql
AS
$$
BEGIN
  IF old.entity_type != new.entity_type THEN
    RAISE EXCEPTION 'Can not change entity_type';
  END IF;
  RETURN new;
END;
$$;

CREATE TRIGGER client_profile_prevent_change_entity_type_tg
  BEFORE UPDATE
  ON client.client_profile
EXECUTE FUNCTION func.prevent_changing_entity_type();

SELECT client.add_history_to_table('client_profile');
------------------------------------------------------------------------------------------------------
CREATE TABLE client.federated_login
(
  federated_login_id UUID DEFAULT func.tuid_generate() PRIMARY KEY,
  client_profile_id UUID REFERENCES client.client_profile -- default to use if set
);
SELECT client.add_history_to_table('federated_login');
------------------------------------------------------------------------------------------------------
CREATE TABLE client.federated_login_x_system
(
  federated_login_x_system_id UUID DEFAULT func.tuid_generate() PRIMARY KEY,
  federated_login_id UUID REFERENCES client.federated_login ON DELETE CASCADE,
  system_name VARCHAR NOT NULL REFERENCES client.system (system_name) ON DELETE RESTRICT,
  identifier VARCHAR NOT NULL,
  UNIQUE (federated_login_id, system_name),
  UNIQUE (system_name, identifier)
);
-- map fed_id to login's in other systems
SELECT client.add_history_to_table('federated_login_x_system');
------------------------------------------------------------------------------------------------------
CREATE TABLE client.client_profile_x_system
(
  client_profile_x_system_id UUID DEFAULT func.tuid_generate() PRIMARY KEY,
  client_profile_id UUID REFERENCES client.client_profile ON DELETE CASCADE,
  system_name VARCHAR NOT NULL REFERENCES client.system (system_name) ON DELETE RESTRICT,
  identifier VARCHAR NOT NULL,
  UNIQUE (client_profile_id, system_name)
);
-- map client_profile_id to login's in other systems
SELECT client.add_history_to_table('client_profile_x_system');
------------------------------------------------------------------------------------------------------

CREATE TABLE client.login
(
  login_id UUID DEFAULT func.tuid_generate() PRIMARY KEY,
  login VARCHAR NOT NULL UNIQUE,
  display_name VARCHAR NOT NULL,
  n VARCHAR, -- n: for use in newer secure password exchange system, if NULL q is pwcrypted
  q VARCHAR, -- either bcrypt(password) or bcrypt(sha512(password, n)) if n is not NULL
  allow_google_login BOOLEAN NOT NULL DEFAULT FALSE
);
SELECT client.add_history_to_table('login');
------------------------------------------------------------------------------------------------------
CREATE TABLE client.login_1_mfa
(
  login_1_mfa_id UUID DEFAULT func.tuid_generate() PRIMARY KEY,
  login VARCHAR NOT NULL UNIQUE REFERENCES client.login (login) ON DELETE CASCADE,
  mfa VARCHAR NOT NULL DEFAULT 'none' CHECK (mfa IN ('none', 'sms', 'app')),
  mfa_key VARCHAR,
  mfa_sms_number VARCHAR
);
SELECT client.add_history_to_table('login_1_mfa');
------------------------------------------------------------------------------------------------------
CREATE TABLE client.login_1_federated_login
(
  login_1_federated_login_id UUID DEFAULT func.tuid_generate() PRIMARY KEY,
  login VARCHAR NOT NULL UNIQUE REFERENCES client.login (login) ON DELETE CASCADE,
  federated_login_id UUID NOT NULL REFERENCES client.federated_login ON DELETE CASCADE
);
SELECT client.add_history_to_table('login_1_federated_login');
ALTER TABLE client.login
  ADD CONSTRAINT l1l1fed_fk FOREIGN KEY (login) REFERENCES client.login_1_federated_login (login);
------------------------------------------------------------------------------------------------------
CREATE TABLE client.client_profile_x_federated_login
(
  client_profile_x_federated_login_id UUID DEFAULT func.tuid_generate() PRIMARY KEY,
  federated_login_id UUID NOT NULL REFERENCES client.federated_login ON DELETE CASCADE,
  client_profile_id UUID NOT NULL REFERENCES client.client_profile ON DELETE CASCADE,
  UNIQUE (federated_login_id, client_profile_id)
);
SELECT client.add_history_to_table('client_profile_x_federated_login');
------------------------------------------------------------------------------------------------------
CREATE TABLE client.login_log
(
  login VARCHAR NOT NULL, -- NOT referenced as we want to retain deleted logins in the log.
  at TIMESTAMPTZ DEFAULT CLOCK_TIMESTAMP(),
  result VARCHAR NOT NULL CHECK (result IN ('+ac', '+pwc', '-pw', '+pw', '-oauth', '+oauth', '-mfa', '+mfa', '-?')),
  remote_address VARCHAR NOT NULL,
  PRIMARY KEY (login, at)
);

CREATE TRIGGER login_log_append_only_tg
  BEFORE DELETE OR TRUNCATE
  ON client.login_log
EXECUTE FUNCTION func.prevent_change();
------------------------------------------------------------------------------------------------------
CREATE TABLE client.login_1_signup_data
(
  login_1_signup_data_id UUID DEFAULT func.tuid_generate() PRIMARY KEY,
  login VARCHAR UNIQUE REFERENCES client.login (login) ON DELETE CASCADE,
  -- encrypted
  signup_data BYTEA NOT NULL -- varchar
);
SELECT client.add_history_to_table('login_1_signup_data');
------------------------------------------------------------------------------------------------------
CREATE TABLE client.client_profile_n_email
(
  client_profile_n_email_id UUID DEFAULT func.tuid_generate() PRIMARY KEY,
  client_profile_id UUID NOT NULL REFERENCES client.client_profile ON DELETE CASCADE,
  email VARCHAR NOT NULL,
  UNIQUE (client_profile_id, email)
);
SELECT client.add_history_to_table('client_profile_n_email');
------------------------------------------------------------------------------------------------------
CREATE TABLE client.client_profile_1_primary_email
(
  client_profile_1_primary_email_id UUID DEFAULT func.tuid_generate() PRIMARY KEY,
  client_profile_id UUID NOT NULL REFERENCES client.client_profile ON DELETE CASCADE,
  primary_email VARCHAR NOT NULL,
  FOREIGN KEY (client_profile_id, primary_email) REFERENCES client.client_profile_n_email (client_profile_id, email) ON DELETE CASCADE,
  UNIQUE (client_profile_id, primary_email)
);
SELECT client.add_history_to_table('client_profile_1_primary_email');
------------------------------------------------------------------------------------------------------
CREATE TABLE client.client_profile_1_person
(
  client_profile_1_person_id UUID DEFAULT func.tuid_generate() PRIMARY KEY,
  client_profile_id UUID UNIQUE REFERENCES client.client_profile ON DELETE CASCADE,
  first_name VARCHAR NOT NULL,
  middle_name VARCHAR NOT NULL DEFAULT '',
  last_name VARCHAR NOT NULL,
  -- encrypted
  date_of_birth BYTEA -- DATE
);
SELECT client.add_history_to_table('client_profile_1_person');
------------------------------------------------------------------------------------------------------
CREATE TABLE client.client_profile_1_company
(
  client_profile_1_company_id UUID DEFAULT func.tuid_generate() PRIMARY KEY,
  client_profile_id UUID UNIQUE REFERENCES client.client_profile ON DELETE CASCADE,
  company_name VARCHAR NOT NULL,
  company_number VARCHAR
);
SELECT client.add_history_to_table('client_profile_1_company');
------------------------------------------------------------------------------------------------------
CREATE TABLE client.client_profile_n_address
(
  client_profile_n_address_id UUID DEFAULT func.tuid_generate() PRIMARY KEY,
  client_profile_id UUID REFERENCES client.client_profile ON DELETE CASCADE,
  kind VARCHAR NOT NULL CHECK (kind IN ('primary', 'mailing', 'employer')),
  UNIQUE (client_profile_id, kind),
  -- encrypted
  address_line1 BYTEA NOT NULL, -- varchar
  address_line2 BYTEA,          -- varchar
  city BYTEA NOT NULL,          -- city
  region BYTEA,                 -- region
  country BYTEA NOT NULL,       -- country
  postal_code BYTEA             -- postal_code
);
SELECT client.add_history_to_table('client_profile_n_address');
------------------------------------------------------------------------------------------------------
CREATE TABLE client.client_profile_n_phone
(
  client_profile_n_phone_id UUID DEFAULT func.tuid_generate() PRIMARY KEY,
  client_profile_id UUID REFERENCES client.client_profile ON DELETE CASCADE,
  kind VARCHAR NOT NULL CHECK (kind IN ('primary', 'secondary', 'mobile', 'employer')),
  UNIQUE (client_profile_id, kind),
  -- encrypted
  phone BYTEA NOT NULL -- varchar
);
SELECT client.add_history_to_table('client_profile_n_phone');
------------------------------------------------------------------------------------------------------
CREATE TABLE staff.client_profile_1_key
(
  client_profile_1_key_id UUID DEFAULT func.tuid_generate() PRIMARY KEY,
  client_profile_id UUID NOT NULL REFERENCES client.client_profile ON DELETE CASCADE UNIQUE,
  ivkey BYTEA NOT NULL
);
SELECT staff.add_history_to_table('client_profile_1_key');
------------------------------------------------------------------------------------------------------
CREATE MATERIALIZED VIEW staff.client_profile_n_phone AS
SELECT client_profile_id,
  kind,
  func.aes_decrypt_to_text(ivkey, phone) AS phone
FROM
  client.client_profile_n_phone
  JOIN staff.client_profile_1_key
  USING (client_profile_id);

CREATE INDEX client_profile_n_phone_phone ON staff.client_profile_n_phone (phone);
------------------------------------------------------------------------------------------------------
CREATE TABLE staff.login
(
  login_id UUID PRIMARY KEY DEFAULT func.tuid_generate(),
  login VARCHAR NOT NULL UNIQUE,
  display_name VARCHAR NOT NULL,
  locale VARCHAR NOT NULL CHECK (locale IN ('en', 'fr')),
  raw_auth_response VARCHAR NOT NULL
);
SELECT staff.add_history_to_table('login');
------------------------------------------------------------------------------------------------------
CREATE TABLE staff.login_log
(
  login VARCHAR NOT NULL, -- NOT references, we want to retain the logs if login is deleted.
  at TIMESTAMPTZ DEFAULT CLOCK_TIMESTAMP() PRIMARY KEY,
  result VARCHAR NOT NULL CHECK (result IN ('+ga', '-?')),
  remote_address VARCHAR NOT NULL
);
CREATE INDEX login_log_login ON staff.login_log (login, at);

CREATE TRIGGER login_log_append_only_tg
  BEFORE DELETE OR TRUNCATE
  ON staff.login_log
EXECUTE FUNCTION func.prevent_change();
------------------------------------------------------------------------------------------------------
CREATE UNLOGGED TABLE client.session
(
  session_id BYTEA DEFAULT stuid_generate() PRIMARY KEY,
  login VARCHAR REFERENCES client.login (login) ON DELETE CASCADE,
  federated_login_id UUID REFERENCES client.federated_login ON DELETE CASCADE, -- can be back filled after creation, so can be NULL
  client_profile_id UUID REFERENCES client.client_profile ON DELETE CASCADE,   -- can be back filled after creation, so can be NULL
  ivkey BYTEA,
  data JSONB DEFAULT '{}'::JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  expire_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP + '1 hour'::INTERVAL NOT NULL,
  CHECK ((federated_login_id IS NOT NULL AND client_profile_id IS NOT NULL) OR
         (federated_login_id IS NULL AND client_profile_id IS NULL))           -- both null, or both set.
);
CREATE INDEX session_user_id ON client.session (federated_login_id, created_at);
------------------------------------------------------------------------------------------------------
CREATE UNLOGGED TABLE staff.session
(
  session_id BYTEA DEFAULT stuid_generate() PRIMARY KEY,
  login VARCHAR REFERENCES staff.login (login) ON DELETE CASCADE, -- can be back filled after creation, so can be NULL
  data JSONB DEFAULT '{}'::JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  expire_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP + '1 hour'::INTERVAL NOT NULL
);
CREATE INDEX session_user_id ON staff.session (login, created_at);

------------------------------------------------------------------------------------------------------
SET search_path = client, func;
\i ./SCHEMA/permission.sql
------------------------------------------------------------------------------------------------------
CREATE TABLE client.client_profile_x_permission
(
  client_profile_x_permission_id UUID NOT NULL DEFAULT func.tuid_generate(),
  client_profile_id UUID NOT NULL REFERENCES client.client_profile,
  permission_name VARCHAR NOT NULL REFERENCES client.permission,
  relation_type VARCHAR NOT NULL DEFAULT 'add' CHECK (relation_type::TEXT = ANY
                                                      (ARRAY ['add'::TEXT, 'remove'::TEXT, 'add_grant'::TEXT])),
  PRIMARY KEY (client_profile_id, permission_name)
);
SELECT client.add_history_to_table('client_profile_x_permission');
------------------------------------------------------------------------------------------------------
CREATE TABLE client.client_profile_x_permission_group
(
  client_profile_x_permission_group_id UUID NOT NULL DEFAULT func.tuid_generate(),
  client_profile_id UUID NOT NULL REFERENCES client.client_profile,
  permission_group_name VARCHAR NOT NULL REFERENCES client.permission_group,
  PRIMARY KEY (client_profile_id, permission_group_name)
);
SELECT client.add_history_to_table('client_profile_x_permission_group');
------------------------------------------------------------------------------------------------------
SET search_path = staff, func;
\i ./SCHEMA/permission.sql
------------------------------------------------------------------------------------------------------
CREATE TABLE staff.login_x_permission
(
  login_x_permission_id UUID NOT NULL DEFAULT func.tuid_generate(),
  login VARCHAR NOT NULL REFERENCES staff.login (login) ON DELETE CASCADE,
  permission_name VARCHAR NOT NULL REFERENCES staff.permission,
  relation_type VARCHAR NOT NULL DEFAULT 'add' CHECK (relation_type::TEXT = ANY
                                                      (ARRAY ['add'::TEXT, 'remove'::TEXT, 'add_grant'::TEXT])),
  PRIMARY KEY (login, permission_name)
);
SELECT staff.add_history_to_table('login_x_permission');
------------------------------------------------------------------------------------------------------
CREATE TABLE staff.login_x_permission_group
(
  login_x_permission_group_id UUID NOT NULL DEFAULT func.tuid_generate(),
  login VARCHAR NOT NULL REFERENCES staff.login (login) ON DELETE CASCADE,
  permission_group_name VARCHAR NOT NULL REFERENCES staff.permission_group,
  PRIMARY KEY (login, permission_group_name)
);
SELECT staff.add_history_to_table('login_x_permission_group');
------------------------------------------------------------------------------------------------------
-- system_setting

CREATE TABLE meta.system_setting
(
  system_setting_id UUID NOT NULL DEFAULT func.tuid_generate(),
  system_setting VARCHAR PRIMARY KEY,
  value JSONB NOT NULL
);

SELECT meta.add_history_to_table('system_setting');

------------------------------------------------------------------------------------------------------
-- trigger to auto assign ivkey on session insert/update
------------------------------------------------------------------------------------------------------

CREATE FUNCTION func.session_ivkey_assign() RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER -- runs as owner
AS
$$
DECLARE
  ivkey_ BYTEA;
BEGIN
  IF new.client_profile_id IS NULL THEN
    new.ivkey = NULL;
    RETURN new;
  END IF;

  INSERT INTO staff.client_profile_1_key (client_profile_id, ivkey)
  VALUES (new.client_profile_id, func.gen_random_bytes(48))
  ON CONFLICT DO NOTHING;

  SELECT ivkey INTO ivkey_ FROM staff.client_profile_1_key WHERE client_profile_id = new.client_profile_id;
  new.ivkey = ivkey_;
  RETURN new;
END;
$$;

ALTER FUNCTION session_ivkey_assign() OWNER TO hello_staff;

CREATE TRIGGER session_ivkey_assign_tg
  BEFORE INSERT OR UPDATE
  ON client.session
  FOR EACH ROW
EXECUTE FUNCTION func.session_ivkey_assign();
------------------------------------------------------------------------------------------------------

SET "audit.user" = '_SETUP_';


------------------------------------------------------------------------------------------------------
-- base permissions
------------------------------------------------------------------------------------------------------

INSERT INTO
  staff.permission (permission_name)
VALUES
  ('ADMIN_SYSTEM_SETTINGS_UPDATE'),
  ('ADMIN_PERMISSION_CREATE'),
  ('ADMIN_PERMISSION_UPDATE'),
  ('ADMIN_PERMISSION_DELETE'),
  ('ADMIN_PERMISSION_VIEW'),
  ('ADMIN_PERMISSION_GROUP_CREATE'),
  ('ADMIN_PERMISSION_GROUP_UPDATE'),
  ('ADMIN_PERMISSION_GROUP_DELETE'),
  ('ADMIN_PERMISSION_GROUP_VIEW')
;

INSERT INTO
  staff.permission_group (permission_group_name)
VALUES
  ('ADMIN');

INSERT INTO
  staff.permission_x_permission_group (permission_group_name, permission_name, relation_type)
SELECT 'ADMIN',
  permission_name,
  'add_grant'
FROM
  staff.permission;


INSERT INTO
  client.permission (permission_name)
VALUES
  ('LOGIN')
;

INSERT INTO
  client.permission_group (permission_group_name)
VALUES
  ('STANDARD');

INSERT INTO
  client.permission_x_permission_group (permission_group_name, permission_name, relation_type)
SELECT 'STANDARD',
  permission_name,
  'add'
FROM
  client.permission;

------------------------------------------------------------------------------------------------------
-- base system settings
------------------------------------------------------------------------------------------------------

INSERT INTO
  meta.system_setting
  (system_setting, value)
VALUES
('allowed_domains', '[
  "wealthbar.com"
]'::JSONB);

------------------------------------------------------------------------------------------------------
-- client.workorders
SET search_path = client, func;
\i ./SCHEMA/workorder.sql

------------------------------------------------------------------------------------------------------
-- staff.workorders

SET search_path = staff, func;
\i ./SCHEMA/workorder.sql

------------------------------------------------------------------------------------------------------

SET search_path = client, func;
INSERT INTO
  client.partner_channel (partner_channel_name, fallback_partner_channel_name)
VALUES
  ('', '');
------------------------------------------------------------------------------------------------------

RESET "audit.user";

------------------------------------------------------------------------------------------------------
