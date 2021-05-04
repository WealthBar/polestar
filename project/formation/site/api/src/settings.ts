// istanbul ignore file

import {serverSettingsType} from 'node_core';

if (!process.env.DB_FORMATION_CLIENT_URL) {
  console.error("DB_FORMATION_CLIENT_URL not set");
  process.abort();
}

export const settings : serverSettingsType = {
  host: process.env.HOST || '0.0.0.0',
  port: process.env.PORT || 8000,
  schema: 'http://', // we should be able to get the forwarder to tell us this.
  mode: 'client',
  appUrl: `app.formation.${process.env.HOST_POSTFIX}`,
  dbConnectionString: process.env.DB_FORMATION_CLIENT_URL,
  secret: process.env.FORMATION_SECRET,
};
