SET "audit.user" = '_SETUP_DEV_';

INSERT INTO
  client.system
  (system_name, domain, access_key, secret_key, error_url)
VALUES
('hello', 'hello.xxx', 'hello', '26798ba5b3701fa5d2a3', 'http://app.hello.xxx')
;

RESET "audit.user";
