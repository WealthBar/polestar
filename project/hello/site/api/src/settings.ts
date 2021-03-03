// istanbul ignore file

import {serverSettingsType, tuidCtor} from 'node_core';

if (!process.env.DB_HELLO_CLIENT_URL) {
  console.error("DB_HELLO_CLIENT_URL not set");
  process.abort();
}

export const settings : serverSettingsType = {
  host: process.env.HOST || '0.0.0.0',
  port: process.env.PORT || 8000,
  schema: 'http://', // we should be able to get the forwarder to tell us this.
  google: {
    id: process.env.GOOGLE_AUTH_CLIENT_ID || '',
    secret: process.env.GOOGLE_AUTH_CLIENT_SECRET || '',
    redirectUri: '',
  },
  mode: 'client',
  dbConnectionString: process.env.DB_HELLO_CLIENT_URL,
};

if (process.env.GOOGLE_AUTH_CLIENT_ID && process.env.GOOGLE_AUTH_CLIENT_SECRET) {
  settings.google = {
    id: process.env.GOOGLE_AUTH_CLIENT_ID,
    secret: process.env.GOOGLE_AUTH_CLIENT_SECRET,
    redirectUri: settings.schema + 'app.hello.local' + '/gauth/continue'
  };
}
