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
CREATE TRIGGER migration_append_only_tg
  BEFORE DELETE OR TRUNCATE
  ON meta.migration
EXECUTE FUNCTION func.prevent_change();
------------------------------------------------------------------------------------------------------
CREATE TABLE client.brand
  (
    brand_id UUID NOT NULL DEFAULT func.tuid_generate() UNIQUE,
    brand_name VARCHAR PRIMARY KEY
  );
SELECT client.add_history_to_table('brand');
------------------------------------------------------------------------------------------------------
CREATE TABLE client.locale
  (
    locale_id UUID NOT NULL DEFAULT func.tuid_generate() UNIQUE,
    locale_name VARCHAR PRIMARY KEY
  );
SELECT client.add_history_to_table('locale');
------------------------------------------------------------------------------------------------------
CREATE TABLE client.jurisdiction
  (
    jurisdiction_id UUID NOT NULL DEFAULT func.tuid_generate() UNIQUE,
    jurisdiction_name VARCHAR PRIMARY KEY
  );
SELECT client.add_history_to_table('jurisdiction');
------------------------------------------------------------------------------------------------------
CREATE TABLE client.system
  (
    system_id UUID NOT NULL DEFAULT func.tuid_generate() UNIQUE,
    system_name VARCHAR PRIMARY KEY,
    domain VARCHAR NOT NULL UNIQUE,
    bearer_token VARCHAR NOT NULL UNIQUE,
    secret_key BYTEA NOT NULL,
    error_url VARCHAR NOT NULL
  );
SELECT client.add_history_to_table('system');
------------------------------------------------------------------------------------------------------
CREATE TABLE client.form_key
  (
    form_key_id UUID NOT NULL DEFAULT func.tuid_generate() UNIQUE,
    form_key_name VARCHAR NOT NULL,
    system_name VARCHAR REFERENCES client.system ON DELETE RESTRICT,
    completion_url VARCHAR NOT NULL, -- on completion
    exit_url VARCHAR NOT NULL,
    expired_url VARCHAR NOT NULL,
    completed_url VARCHAR NOT NULL,  -- already complete
    flow_name VARCHAR NOT NULL,
    PRIMARY KEY (system_name, form_key_name)
  );
SELECT client.add_history_to_table('form_key');
------------------------------------------------------------------------------------------------------
CREATE TABLE client.flow
  (
    flow_id UUID NOT NULL DEFAULT func.tuid_generate() UNIQUE,
    flow_name VARCHAR PRIMARY KEY
  );
SELECT client.add_history_to_table('flow');
------------------------------------------------------------------------------------------------------
CREATE TABLE client.form_request
  (
    form_request_id UUID NOT NULL DEFAULT func.tuid_generate() UNIQUE,
    stoken BYTEA PRIMARY KEY,
    form_key_name VARCHAR NOT NULL,
    system_name VARCHAR NOT NULL,
    CONSTRAINT form_key_fk FOREIGN KEY (system_name, form_key_name) REFERENCES client.form_key,
    brand_name VARCHAR NOT NULL REFERENCES client.brand ON DELETE RESTRICT,
    jurisdiction_name VARCHAR NOT NULL REFERENCES client.jurisdiction ON DELETE RESTRICT,
    signing_date DATE NOT NULL,
    locale_name VARCHAR NOT NULL REFERENCES client.locale,
    valid_until TIMESTAMPTZ NOT NULL,
    form_data JSONB NOT NULL,
    docusign_template_identifiers VARCHAR[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
SELECT client.add_history_to_table('form_request');
------------------------------------------------------------------------------------------------------
CREATE TABLE client.form_result
  (
    form_request_id UUID NOT NULL PRIMARY KEY REFERENCES client.form_request(form_request_id),
    form_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
SELECT client.add_history_to_table('form_result');
------------------------------------------------------------------------------------------------------
CREATE TABLE client.form_sign
  (
    form_request_id UUID NOT NULL PRIMARY KEY REFERENCES client.form_request(form_request_id),
    form_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
SELECT client.add_history_to_table('form_result');
------------------------------------------------------------------------------------------------------
CREATE TABLE client.docusign_mapping
  (
    docusign_mapping_id UUID PRIMARY KEY,
    flow_name VARCHAR REFERENCES client.flow ON DELETE RESTRICT,
    brand_name VARCHAR REFERENCES client.brand ON DELETE RESTRICT,
    jurisdiction_name VARCHAR REFERENCES client.jurisdiction ON DELETE RESTRICT,
    locale_name VARCHAR REFERENCES client.locale ON DELETE RESTRICT,
    in_use_window DATERANGE DEFAULT '(,)'::DATERANGE,
    CONSTRAINT docusign_mapping_window_bounds
      CHECK ((LOWER_INC(in_use_window) OR (LOWER(in_use_window) IS NULL)) AND (NOT UPPER_INC(in_use_window))),
    CONSTRAINT docusign_mapping_juri_name_brand_locale_window_exclude
      EXCLUDE USING gist (jurisdiction_name WITH =, flow_name WITH =, brand_name WITH =, locale_name WITH =, in_use_window WITH &&),
    template_identifiers VARCHAR[] NOT NULL
  );
SELECT client.add_history_to_table('docusign_mapping');
------------------------------------------------------------------------------------------------------
CREATE TABLE client.access_log
  (
    bearer_token VARCHAR NOT NULL, -- NOT references, we want to retain the logs if login is deleted.
    at TIMESTAMPTZ DEFAULT CLOCK_TIMESTAMP() PRIMARY KEY,
    result VARCHAR NOT NULL CHECK (result IN ('+', '-')),
    remote_address VARCHAR NOT NULL
  );
CREATE INDEX access_log_at ON client.access_log(bearer_token, at);

CREATE TRIGGER access_log_append_only_tg
  BEFORE DELETE OR TRUNCATE
  ON client.access_log
EXECUTE FUNCTION func.prevent_change();
------------------------------------------------------------------------------------------------------
CREATE UNLOGGED TABLE client.session
  (
    session_id BYTEA DEFAULT func.stuid_generate() PRIMARY KEY,
    stoken BYTEA REFERENCES client.form_request,
    ivkey BYTEA,
    data JSONB DEFAULT '{}'::JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expire_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP + '1 hour'::INTERVAL NOT NULL
  );
------------------------------------------------------------------------------------------------------
CREATE TABLE staff.login
  (
    login_id UUID PRIMARY KEY DEFAULT func.tuid_generate(),
    login VARCHAR NOT NULL UNIQUE,
    display_name VARCHAR NOT NULL,
    locale_name VARCHAR NOT NULL REFERENCES client.locale,
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
CREATE INDEX login_log_login ON staff.login_log(login, at);

CREATE TRIGGER login_log_append_only_tg
  BEFORE DELETE OR TRUNCATE
  ON staff.login_log
EXECUTE FUNCTION func.prevent_change();
------------------------------------------------------------------------------------------------------
CREATE UNLOGGED TABLE staff.session
  (
    session_id BYTEA DEFAULT stuid_generate() PRIMARY KEY,
    login VARCHAR REFERENCES staff.login(login) ON DELETE CASCADE, -- can be back filled after creation, so can be NULL
    data JSONB DEFAULT '{}'::JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expire_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP + '1 hour'::INTERVAL NOT NULL
  );
CREATE INDEX session_user_id ON staff.session(login, created_at);

------------------------------------------------------------------------------------------------------
SET search_path = staff, func;
\i ./SCHEMA/permission.sql
------------------------------------------------------------------------------------------------------
CREATE TABLE staff.login_x_permission
  (
    login_x_permission_id UUID NOT NULL DEFAULT func.tuid_generate(),
    login VARCHAR NOT NULL REFERENCES staff.login(login) ON DELETE CASCADE,
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
    login VARCHAR NOT NULL REFERENCES staff.login(login) ON DELETE CASCADE,
    permission_group_name VARCHAR NOT NULL REFERENCES staff.permission_group,
    PRIMARY KEY (login, permission_group_name)
  );
SELECT staff.add_history_to_table('login_x_permission_group');
------------------------------------------------------------------------------------------------------
CREATE TABLE staff.stoken_1_key
  (
    stoken_1_key UUID DEFAULT tuid_generate() NOT NULL PRIMARY KEY,
    stoken BYTEA NOT NULL
      UNIQUE
      REFERENCES client.form_request
        ON DELETE CASCADE,
    ivkey BYTEA NOT NULL
  );
SELECT staff.add_history_to_table('stoken_1_key');
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
  IF new.stoken IS NULL THEN
    new.ivkey = NULL;
    RETURN new;
  END IF;

  INSERT INTO staff.stoken_1_key (stoken, ivkey)
  VALUES (new.stoken, func.gen_random_bytes(48))
  ON CONFLICT DO NOTHING;

  SELECT ivkey INTO ivkey_ FROM staff.stoken_1_key WHERE stoken = new.stoken;
  new.ivkey = ivkey_;
  RETURN new;
END;
$$;

ALTER FUNCTION session_ivkey_assign() OWNER TO formation_staff;

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
SELECT
  'ADMIN',
  permission_name,
  'add_grant'
FROM
  staff.permission;

------------------------------------------------------------------------------------------------------
-- base system settings
------------------------------------------------------------------------------------------------------

INSERT INTO
  meta.system_setting
  (system_setting, value)
VALUES
(
  'allowed_domains', '[
  "wealthbar.com"
]'::JSONB);

------------------------------------------------------------------------------------------------------
-- client.workorders
SET search_path = client, func;
\i ../../lib/db/workorder/v2/INDEX.sql

------------------------------------------------------------------------------------------------------
-- staff.workorders

SET search_path = staff, func;
\i ../../lib/db/workorder/v2/INDEX.sql

------------------------------------------------------------------------------------------------------
SET search_path = client, func;
INSERT INTO
  client.locale (locale_name)
VALUES
  ('en'),
  ('fr');

INSERT INTO
  client.jurisdiction (jurisdiction_name)
VALUES
  (''),
  ('ca'),
  ('ca_ab'),
  ('ca_bc'),
  ('ca_mb'),
  ('ca_nb'),
  ('ca_nl'),
  ('ca_ns'),
  ('ca_nt'),
  ('ca_nu'),
  ('ca_on'),
  ('ca_pe'),
  ('ca_qc'),
  ('ca_sk'),
  ('ca_yt')
;

------------------------------------------------------------------------------------------------------

RESET "audit.user";

------------------------------------------------------------------------------------------------------
