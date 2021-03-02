import {dbProviderType} from './db_provider';
import {value as createSql} from './db_session_create_sql';
import {value as deleteSql} from './db_session_delete_sql';
import {value as expireSql} from './db_session_expire_sql';
import {value as updateSql} from './db_session_update_sql';
import {value as verifyClientSql} from './db_session_verify_client_sql';
import {value as verifyStaffSql} from './db_session_verify_staff_sql';
import debugCtor = require('debug');
import {ctxSetDb} from '../ctx';
import {serializableType} from 'ts_agnostic';
import {ctxBaseType} from '../server.type';

const debug = debugCtor('db:session');

export async function sessionCreate(ctx: Pick<ctxBaseType, 'sessionId' | 'session' | 'dbProvider' | 'db'>): Promise<void> {
  return ctx.dbProvider('-SESSION-', async (db) => {
    const result: { session_id?: string } = await db.one(createSql);
    debug(`create result: ${JSON.stringify(result)}`);
    if (!result.session_id) {
      throw Error('could not create a new session.');
    }
    ctx.sessionId = result.session_id;
    ctx.session = {};
    ctxSetDb(ctx);
  }, '-');
}

export async function sessionVerify(ctx: Pick<ctxBaseType, 'sessionId' | 'session' | 'dbProvider' | 'user' | 'db' | 'settings'>): Promise<void> {
  if (ctx.sessionId === '') {
    await sessionCreate(ctx);
  }
  return ctx.dbProvider('-SESSION-', async (db) => {
    const result: {
      login: string,
      data: Record<string, serializableType>,
      client_profile_id?: string,
      federated_login_id?: string
    } | null = await db.oneOrNone(
      ctx.settings.mode === 'client' ? verifyClientSql : verifyStaffSql,
      {
        sessionId: ctx.sessionId,
      },
    );
    debug(`verify result: ${JSON.stringify(result)}`);
    if (!result) {
      ctx.sessionId = '';
      await sessionCreate(ctx);
    } else {
      if (ctx.user) {
        ctx.user.login = result.login;
      } else {
        ctx.user = {login: result.login, clientProfileId: result.client_profile_id, federatedLoginId: result.federated_login_id};
      }
      ctx.session = result.data;
    }
  }, ctx.sessionId);
}

export async function sessionUpdate(ctx: Pick<ctxBaseType, 'sessionId' | 'session' | 'dbProvider' | 'user'>): Promise<void> {
  if (ctx.sessionId === '') {
    return;
  }

  return ctx.dbProvider('-SESSION-', async (db) => {
    const result = await db.result(
      updateSql,
      {
        sessionId: ctx.sessionId,
        data: ctx.session,
        login: ctx?.user?.login,
        clientProfileId: ctx?.user?.clientProfileId,
        federatedLoginId: ctx?.user?.federatedLoginId,
      },
    );
    debug(`update result: ${JSON.stringify(result)}`);
  }, ctx.sessionId);
}


export async function sessionDelete(ctx: { sessionId: string, dbProvider: dbProviderType }): Promise<void> {
  return ctx.dbProvider('-SESSION-', async (db) => {
    const result = await db.result(deleteSql, {sessionId: ctx.sessionId});
    debug(`delete result: ${JSON.stringify(result)}`);
  }, ctx.sessionId);
}

/* expire old sessions, should be done on an interval setup in server so doesn't have a context */
export async function sessionExpire(dbProvider: dbProviderType): Promise<void> {
  return dbProvider('-SESSION-', async (db) => {
    const result = await db.result(expireSql);
    debug(`expire result: ${JSON.stringify(result)}`);
  }, '-');
}


