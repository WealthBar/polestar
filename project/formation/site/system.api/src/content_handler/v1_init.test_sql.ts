export const value = `
SET "audit.user" = '_TEST_FORMATION_V1_INIT_';

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

INSERT INTO brand (brand_name) VALUES ('test');

INSERT INTO
  flow
  (flow_name)
VALUES
  ('test_flow');

INSERT INTO
  form_key
(form_key_name,
 system_name,
 completion_url,
 exit_url,
 expired_url,
 completed_url,
 flow_name)
VALUES
('test_key',
 'test',
 'http://app.test.xxx/comp',
 'http://app.test.xxx/exit',
 'http://app.test.xxx/expr',
 'http://app.test.xxx/btdt',
 'test_flow');


`;
