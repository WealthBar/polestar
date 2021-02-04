// istanbul ignore file

import {tuidCtor} from 'node_core/src/tuid';
import {bindType} from 'node_core/src/server.type';

const bind: bindType = (process.env.bind === undefined) ?
  {kind: 'unix'} :
  {kind: 'default'};

export const settings = {
  bind,
  schema: 'http://', // we should be able to get the forwarder to tell us this.
  sessionSecret: process.env.SESSION_SECRET || tuidCtor(),
  google: {
    id: process.env.GOOGLE_AUTH_CLIENT_ID || '',
    secret: process.env.GOOGLE_AUTH_CLIENT_SECRET || '',
    redirectUri: '',
  },
};

// TODO: find a way for gauth to derive this from headers and conventions.
settings.google.redirectUri = settings.schema + 'app.hello.local' + '/gauth/continue';
