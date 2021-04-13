import {crServerVerify, ctxWsType, normalizeEmail} from 'node_core';
import {serializableType} from 'ts_agnostic';
import {value as recordLoginAttemptSql} from './record_login_attempt_sql';
import {value as loginSuccessSql} from './login_success_sql';

export async function wsVerifyLogin(ctxWs: Pick<ctxWsType, 'session' | 'db' | 'user' | 'remoteAddress'>, params: serializableType): Promise<serializableType> {
  console.log('wsVerifyLogin', params);
  const p = params as { login: string, fb64: string };
  if (!p || !p.login || !p.fb64) {
    return {error: 'INVALID_PARAMETERS'};
  }
  const {login, fb64} = p;

  try {
    const session = ctxWs.session as { signin: { login?: string, r?: string, nb64?: string, q?: string, secret?: string } };
    if (!session.signin) {
      return {error: 'LOGIN_FAILED'};
    }
    const signin = session.signin;
    if (!signin.r || !signin.nb64 || !signin.q || !signin.secret || signin.login !== login) {
      return {error: 'LOGIN_FAILED'};
    }
    const {r, q, secret} = signin;
    const normalizedLogin = normalizeEmail(login);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    if (crServerVerify(fb64, r, q, secret)) {
      const rlogin = await ctxWs.db(async (db) => {
        return db.one<{ client_profile_id?: string, federated_login_id?: string }>(
          loginSuccessSql,
          {normalizedLogin, result: '+pw', remoteAddress: ctxWs.remoteAddress },
        );
      });
      if (rlogin) {
        ctxWs.user = {
          login,
          clientProfileId: rlogin.client_profile_id,
          federatedLoginId: rlogin.federated_login_id,
        };
        delete ctxWs.session.signin;
        return {};
      }
    }
    await ctxWs.db(async (db) => {
      return db.none(recordLoginAttemptSql, {normalizedLogin, result: '-pw', remoteAddress: ctxWs.remoteAddress});
    });
    return {error: 'LOGIN_FAILED'};

  } catch (e) {
    console.error(e);
    return {error: 'EXCEPTION', e};
  }
}
