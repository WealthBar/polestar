import {ctxWsType} from 'node_core';
import {serializableType} from 'ts_agnostic';
import {value as loginStatusSql} from './login_status_sql';
import {normalizeEmail} from './normalize_email';

export async function wsLoginStatus(ctxWs: Pick<ctxWsType, 'db'>, params: serializableType): Promise<serializableType> {
  console.log('wsLoginStatus', params);
  const p = params as { login: string };
  if (!p) {
    return {inUse: false, allowGoogleLogin: false};
  }
  const {login} = p;
  const normalizedLogin = normalizeEmail(login);

  return ctxWs.db(async (db) => {
    try {
      const r = await db.oneOrNone<{ in_use: boolean, allow_google_login: boolean }>(loginStatusSql, {normalizedLogin});
      if (!r) {
        return {inUse: false, allowGoogleLogin: false};
      }
      return {inUse: r.in_use, allowGoogleLogin: r.allow_google_login};
    } catch (e) {
      console.error('wsloginStatus exception: ', e);
      return {inUse: false, allowGoogleLogin: false};
    }
  });
}
