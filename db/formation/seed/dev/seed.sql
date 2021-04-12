SET "audit.user" = '_SETUP_DEV_';

INSERT INTO
  client.system
(system_name,
 domain,
 bearer_token,
 secret_key,
 error_url)
VALUES
('hello',
 'hello.xxx',
 'hello',
 DECODE('d0ed061c0e9e9490d662f9ed6c26c0d6269fb23ed34cdbd37436cce46736a1d6e7bee2cd490a4ebc43dbab6191f237e5', 'hex'),
 'http://app.hello.xxx')
;

RESET "audit.user";
