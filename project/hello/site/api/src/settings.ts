// istanbul ignore file

import {serverSettingsType, tuidCtor} from 'node_core';

export const settings : serverSettingsType = {
  host: process.env.HOST || '0.0.0.0',
  port: process.env.PORT || 8000,
  schema: 'http://', // we should be able to get the forwarder to tell us this.
  sessionSecret: process.env.SESSION_SECRET || tuidCtor(),
  google: {
    id: process.env.GOOGLE_AUTH_CLIENT_ID || '',
    secret: process.env.GOOGLE_AUTH_CLIENT_SECRET || '',
    redirectUri: '',
  },
};

// TODO: find a way for gauth to derive this from headers and conventions.
if (settings.google) {
  settings.google.redirectUri = settings.schema + 'app.hello.local' + '/gauth/continue';
}
