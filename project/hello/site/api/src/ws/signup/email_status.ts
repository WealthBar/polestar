import {ctxWsType} from 'node_core';
import {serializableType} from 'ts_agnostic';
import {value as emailStatusSql} from './email_status_sql';

export async function wsEmailStatus(ctxWs: Pick<ctxWsType, 'db'>, params: serializableType): Promise<serializableType> {
  console.log('wsEmailStatus', params);
  const p = params as { email: string };
  if (!p) {
    return {inUse: false, allowGoogleLogin: false};
  }
  const {email} = p;

  return ctxWs.db(async (db) => {
    try {
      const r = await db.oneOrNone<{ in_use: boolean, allow_google_login: boolean }>(emailStatusSql, {email});
      if (!r) {
        return {inUse: false, allowGoogleLogin: false};
      }
      return {inUse: r.in_use, allowGoogleLogin: r.allow_google_login};
    } catch (e) {
      console.error('wsEmailStatus exception: ', e);
      return {inUse: false, allowGoogleLogin: false};
    }
  });
}
