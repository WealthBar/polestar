SET "audit.user" = '_SETUP_DEV_';

INSERT INTO
  client.system
  (system_name, domain, bearer_token, secret_key, error_url)
VALUES
('hello', 'hello.xxx', 'hello', func.gen_random_bytes(48), 'http://app.hello.xxx')
;

RESET "audit.user";
