import {dbProviderType} from './db_provider';
import {value as byIdSql} from './db_user_by_id_sql';
import {value as vivifySql} from './db_user_vivify_sql';
import debugCtor = require('debug');

const debug = debugCtor('db:user');

export type dbUserType = {
  vivify(userInfo: { email: string, displayName: string }, trackingTag: string): Promise<string | undefined>,
  byId(userId: string, trackingTag: string): Promise<{ userId: string, displayName: string, email: string } | undefined>,
};

export function dbUserCtor(dbProvider: dbProviderType): dbUserType {
  /* lookup/create (vivify) a user based on the google userInfo and return the user's id. */
  async function vivify(userInfo: { email: string, displayName: string }, trackingTag: string): Promise<string | undefined> {
    return dbProvider('-USER-', async (db) => {
      const result = await db.one(
        vivifySql,
        {
          email: userInfo.email,
          displayName: userInfo.displayName,
        },
      );
      debug(`vivify result=${JSON.stringify(result)}`);

      if (result && result.user_id) {
        return result.user_id;
      }

      return undefined;
    }, trackingTag);
  }

  /* lookup a user by id and return the userId, displayName, and primary email
     note: email can be undefined, but this is very unlikely to happen currently.
  */
  async function byId(userId: string, trackingTag: string): Promise<{ userId: string, displayName: string, email: string } | undefined> {
    return dbProvider(userId + '?', async (db) => {

      const result = await db.one(
        byIdSql,
        {userId},
      );

      debug(`byId(${userId}) result=${JSON.stringify(result)}`);
      if (result?.user_id) {
        return {userId: result.user_id, displayName: result.display_name, email: result.email};
      }
      return undefined;
    }, trackingTag);
  }

  return {
    vivify,
    byId,
  };
}
