import * as pgPromise from 'pg-promise';
import debugCtor = require('debug');
import {IConnectionParameters} from 'pg-promise/typescript/pg-subset';

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

export function dbProviderCtor(connectionString: string): dbProviderType {
  let db: dbType;

  async function dbProvider<T>(
    auditUser: string,
    callback: (db: dbType) => Promise<T>,
    trackingTag = '',
  ): Promise<T|undefined> {
    if (!db) {
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
      const m = connectionString.match(/^postgres:\/\/((?<user>[^:]+):(?<password>[^@]+)@)?(?<host>[^:]+):(?<port>[^/]+)\/(?<database>[^?]+)/);
      if(!m || !m.groups?.user || !m.groups?.host || !m.groups?.database || !m.groups?.password) {
        throw new Error('Invalid connection string: ' + connectionString);
      }
      const user = m.groups.user;
      const host = m.groups.host;
      const port = +(m.groups?.port || '5432');
      const database = m.groups.database;

      debug("DB: %s@%s:%s/%s", user, host, port, database);

      const password = m.groups.password;
      const connectionParameters: IConnectionParameters = {
        application_name: 'ems',
        database,
        host,
        port,
        user,
        password,
        ssl: host === 'localhost' ? false : {rejectUnauthorized: false},
      };
      db = pgPromise<Ext>(pgPromiseOptions)(connectionParameters);
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

