// istanbul ignore file

import {serverSettingsType} from 'node_core';

if (!process.env.DB_HELLO_STAFF_URL) {
  console.error("DB_HELLO_STAFF_URL not set");
  process.abort();
}

const schema = process.env.CONFIG_ENV !== 'PRODUCTION' ? 'http://' : 'https://';
export const settings : serverSettingsType = {
  host: process.env.HOST || '0.0.0.0',
  port: process.env.PORT || 8000,
  schema,
  google: {
    id: process.env.GOOGLE_AUTH_CLIENT_ID || '',
    secret: process.env.GOOGLE_AUTH_CLIENT_SECRET || '',
    redirectUri: '',
  },
  mode: 'staff',
  appUrl: schema + `staff.app.hello.${process.env.HOST_POSTFIX}`,
  dbConnectionString: process.env.DB_HELLO_STAFF_URL,
};

if (process.env.GOOGLE_AUTH_CLIENT_ID && process.env.GOOGLE_AUTH_CLIENT_SECRET) {
  settings.google = {
    id: process.env.GOOGLE_AUTH_CLIENT_ID,
    secret: process.env.GOOGLE_AUTH_CLIENT_SECRET,
    redirectUri: schema + `staff.api.hello.${process.env.HOST_POSTFIX}` + '/gauth/continue' // TODO
  };
}
