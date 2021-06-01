// istanbul ignore file

import {serverSettingsType} from 'node_core';

if (!process.env.DB_WB_CLIENT_URL) {
  console.error("DB_WB_CLIENT_URL not set. ASSUMING DEV");
}

if (!process.env.CDASH_BEARER_MAPPING) {
  console.error("CDASH_BEARER_MAPPING not set. ASSUMING DEV");
}

const rawBearerMapping = process.env.CDASH_BEARER_MAPPING || '5655885fab1d9806eb2c5adebbd5d2baab19b909d04aa94259365b4687d8e8aa47ea9384224a13d2fe84990dabb10f7eea36f6c01af5c268ea9527f356948c18=p,b53b00b9e6397d05f56a2b42ae026b2c9958efeb111f72d71348e7b4f0a8ba79d30040511fc667de8a2218cd971378116e27eb13e54028b6646daf42e2bdd3d1=d';

// convert a=b,c=d to {a:b,c:d}
const bearerMapping: Record<string, string> = {};

rawBearerMapping.split(',').map(e => e.split('=')).forEach(x => bearerMapping[x[0]] = x[1]);

export const settings: serverSettingsType & { bearerMapping: typeof bearerMapping } = {
  host: process.env.HOST || '0.0.0.0',
  port: process.env.PORT || 8000,
  schema: 'http://', // we should be able to get the forwarder to tell us this.
  appUrl: `api.cdash.cidi.${process.env.HOST_POSTFIX}`,
  dbConnectionString: process.env.DB_WB_CLIENT_URL || 'postgres://postgres@localhost:5432/wealthbar_dev',
  secret: process.env.CDASH_SECRET,
  bearerMapping,
};

