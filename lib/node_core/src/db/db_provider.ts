import * as pgPromise from 'pg-promise';
import debugCtor = require('debug');

const debug = debugCtor(
  'db',
);

type Ext = Record<string, unknown>;
export type dbType = pgPromise.IDatabase<Ext> | pgPromise.ITask<Ext>;
export type dbProviderType = <T>(
  auditUser: string,
  callback: (db: dbType) => Promise<T>,
  trackingTag?: string,
) => Promise<T|undefined>;

type settingProviderType = ()=>Promise<{databaseUrl, databaseUrlTest}>;

export function dbProviderCtor(getSettings:settingProviderType, test = false): dbProviderType {
  let db: dbType;

  async function dbProvider<T>(
    auditUser: string,
    callback: (db: dbType) => Promise<T>,
    trackingTag = '',
  ): Promise<T|undefined> {
    if (!db) {
      const settings = await getSettings();
      const {databaseUrl, databaseUrlTest} = settings;

      const pgPromiseOptions = {
        query:
          (e) => {
            debug(
              'QUERY: ',
              e.query,
            );
            if (e.params) {
              debug(
                'PARAMS:',
                e.params,
              );
            }
          },
      };
      db = pgPromise<Ext>(pgPromiseOptions)(test ? databaseUrlTest : databaseUrl);
    }

    return db.tx(async (db) => {
      await db.none(
        'SET local "audit.user" TO $(user); SET local "audit.tracking_tag" TO $(trackingTag); SET local timezone TO \'UTC\';',
        {user: auditUser, trackingTag});
      return callback(db);
    });
  }

  return dbProvider;
}

/* istanbul ignore next */
export async function rolledback(dbProvider: dbProviderType, cb: (db: dbType) => Promise<void>) : Promise<void> {
  return dbProvider('test', async db => {
    try {
      await db.tx(async db => {
        await cb(db);
        throw new Error('rolledback');
      });
    } catch (e) {
      if (e !== 'rolledback') {
        throw e;
      }
    }
  });
}

