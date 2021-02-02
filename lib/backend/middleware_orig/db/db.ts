import {dbProvider, dbType} from '../../db/db_provider';
import debugCtor = require('debug');

const debug = debugCtor('middleware:db');

type dbProviderType = typeof dbProvider;
export type ctxDbType = { dbProvider: <T>(callback: (db: dbType) => Promise<T>) => Promise<T|undefined> };
export const ctxDbRollback = Symbol('ctxDbRollback');

export function dbCtor(dbProvider: dbProviderType) {
  return {
    async middleware(ctx, next) {
      const {sessionInfo} = ctx;
      let auditUser = '-ANON-';
      if (ctx.sessionInfo) {
        const {userId, email} = ctx.sessionInfo;
        auditUser = `${userId}:${email}`;
      }

      debug('sessionInfo:%o', sessionInfo);
      ctx.dbProvider = (db) => dbProvider(auditUser, db, ctx.requestId);

      try {
        await next();
      } catch (e) {
        if (e !== ctxDbRollback) {
          throw e;
        }
      }

      delete ctx.dbProvider;
    },
  };
}

export const db = dbCtor(dbProvider);
