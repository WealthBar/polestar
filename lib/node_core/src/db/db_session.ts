import {dbProviderType} from './db_provider';
import {value as createSql} from './db_session_create_sql';
import {value as deleteSql} from './db_session_delete_sql';
import {value as expireSql} from './db_session_expire_sql';
import {value as updateSql} from './db_session_update_sql';
import {value as verifySql} from './db_session_verify_sql';
import debugCtor = require('debug');
import {ctxSetDb} from '../ctx';
import {dbProviderCtx} from '../db_util';
import {serializableType} from 'ts_agnostic';
import {ctxBaseType} from '../server.type';

const debug = debugCtor('db:session');

export async function sessionCreate(ctx: { sessionId: string, dbProvider: dbProviderType, db?: dbProviderCtx, session: Record<string, unknown> }): Promise<void> {
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

export async function sessionVerify(ctx: { sessionId: string, dbProvider: dbProviderType, db: dbProviderCtx, user?: { login?: string }, session: Record<string, unknown> }): Promise<void> {
  if (ctx.sessionId === '') {
    await sessionCreate(ctx);
  }
  return ctx.dbProvider('-SESSION-', async (db) => {
    const result: { login: string, data: Record<string, unknown> } | null = await db.oneOrNone(
      verifySql,
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
        ctx.user = {login: result.login};
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
        federatedLoginId: ctx?.user?.federatedLoginId
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


