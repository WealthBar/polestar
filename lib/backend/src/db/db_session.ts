import {dbProviderType} from './db_provider';
import {value as createSql} from './db_session_create_sql';
import {value as deleteSql} from './db_session_delete_sql';
import {value as expireSql} from './db_session_expire_sql';
import {value as updateSql} from './db_session_update_sql';
import {value as verifySql} from './db_session_verify_sql';
import debugCtor = require('debug');

const debug = debugCtor('db:session');

export type sessionInfoType = {
  sessionId?: string,
  data: Record<string, unknown>,
  userId?: string,
  displayName?: string,
  email?: string,
  permission?: { [name: string]: boolean }
};

export type dbSessionType = {
  create(trackingTag: string): Promise<{ sessionId: string, data: Record<string, unknown> } | undefined>,
  verify(sessionId: string, trackingTag: string): Promise<sessionInfoType | undefined>,
  update(sessionInfo: sessionInfoType, expiryInterval: number, trackingTag: string): Promise<void>,
  expire(trackingTag: string): Promise<void>,
  delete(sessionId: string, trackingTag: string): Promise<void>,
};

export function dbSessionCtor(dbProvider: dbProviderType): dbSessionType {
  /* return {sessionId:} */
  async function create(trackingTag: string): Promise<{ sessionId: string, data: Record<string, unknown> } | undefined> {
    return dbProvider('-SESSION-', async (db) => {
      const result = await db.one(createSql);
      debug(`create result: ${JSON.stringify(result)}`);
      if (!result || !result.session_id) {
        throw Error('could not create a new session.');
      }
      return {sessionId: result.session_id, data: result.data};
    }, trackingTag);
  }

  /* return {sessionId: userId:, data:} or undefined */
  async function verify(sessionId: string, trackingTag: string): Promise<sessionInfoType | undefined> {
    return dbProvider('-SESSION-', async (db) => {
      const result: { user_id: string, data: Record<string, unknown> } | null | undefined = await db.oneOrNone(
        verifySql,
        {
          sessionId,
        },
      );
      debug(`verify result: ${JSON.stringify(result)}`);
      if (result) {
        return {sessionId, userId: result.user_id, data: result.data};
      }
    }, trackingTag);
  }

  /* data is persisted and expiry is extended by expiryInterval milliseconds */
  async function update(sessionInfo: sessionInfoType, expiryInterval: number, trackingTag: string): Promise<void> {
    return dbProvider('-SESSION-', async (db) => {
      const result = await db.result(
        updateSql,
        {
          sessionId: sessionInfo.sessionId,
          userId: sessionInfo.userId,
          data: sessionInfo.data,
          expiryInterval,
        },
      );
      debug(`update result: ${JSON.stringify(result)}`);
    }, trackingTag);
  }

  /* expire old sessions */
  async function expire(trackingTag: string): Promise<void> {
    return dbProvider('-SESSION-', async (db) => {
      const result = await db.result(expireSql);
      debug(`expire result: ${JSON.stringify(result)}`);
    }, trackingTag);
  }

  async function delete_(sessionId: string, trackingTag: string): Promise<void> {
    return dbProvider('-SESSION-', async (db) => {
      const result = await db.result(deleteSql, {sessionId});
      debug(`delete result: ${JSON.stringify(result)}`);
    }, trackingTag);
  }

  return {
    create,
    verify,
    update,
    expire,
    delete: delete_,
  };
}

