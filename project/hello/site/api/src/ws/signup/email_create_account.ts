import {ctxWsType} from 'node_core';
import {serializableType} from 'ts_agnostic';
import {value as emailCreateAccountSql} from './email_create_account_sql';


export async function wsEmailCreateAccount(ctxWs: Pick<ctxWsType, 'db' | 'session'>, params: serializableType): Promise<serializableType> {
  console.log('wsEmailCreateAccount', params);
  const p = params as { email: string, code: string, password: string };
  if (!p || !p.email || !p.code || !p.password) {
    return {error: 'INVALID_PARAMETERS'};
  }
  const {email, code, password} = p;
  const signup = ctxWs.session.signup as { verify?: { email?: string, code?: string } };
  if (signup?.verify?.email === email && signup?.verify?.code === code) {
    await ctxWs.db(async (db) => {
      try {
        const {n, q, r} = crInit(password);
        const result = await db.oneOrNone<{ login }>(emailCreateAccountSql, {email, n, q, r});
        if (!result) {
          return {error: 'CREATE_FAILED'};
        }
        return {};
      } catch (e) {
        console.error('wsEmailStatus exception: ', e);
        return {error: 'EXCEPTION', e};
      }
    });
    return {};
  }
  return {error: 'VERIFY_FAILED'};
}
