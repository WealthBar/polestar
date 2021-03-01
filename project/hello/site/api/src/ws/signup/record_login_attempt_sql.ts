export const value = `
INSERT INTO
  login_log (login, result, remote_address)
VALUES
  ($(normalizedLogin), $(result), $(remoteAddress))
;

`;
