SET "audit.user" = '_TEST_FORMATION_V1_AUTH_';

INSERT INTO
  system
(system_name,
 domain,
 bearer_token,
 secret_key,
 error_url)
VALUES
('test',
 'test.xxx',
 'test123',
 DECODE('d0ed061c0e9e9490d662f9ed6c26c0d6269fb23ed34cdbd37436cce46736a1d6e7bee2cd490a4ebc43dbab6191f237e5', 'hex'),
 'http://app.test.xxx');
