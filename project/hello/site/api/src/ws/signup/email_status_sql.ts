export const value = `
SELECT TRUE AS in_use
     , allow_google_login
FROM
  login
WHERE login = $(email);

`;
