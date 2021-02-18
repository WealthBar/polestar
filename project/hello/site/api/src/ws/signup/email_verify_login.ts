import {crServerVerify, ctxWsType} from 'node_core';
import {serializableType} from 'ts_agnostic';
import {value as emailLoginSql} from './email_login_sql';
import {value as emailLoginFailedSql} from './email_login_failed_sql';

export async function wsEmailVerifyLogin(ctxWs: Pick<ctxWsType, 'session' | 'db' | 'user'>, params: serializableType): Promise<serializableType> {
  console.log('wsEmailInitChallenge', params);
  const p = params as { email: string, fb64: string };
  if (!p || !p.email || !p.fb64) {
    return {error: 'INVALID_PARAMETERS'};
  }
  const {email, fb64} = p;

  try {
    const session = ctxWs.session as { signin: { email?: string, r?: string, nb64?: string, q?: string, secret?: string } };
    if (!session.signin) {
      return {error: 'LOGIN_FAILED'};
    }
    const signin = session.signin;
    if (!signin.r || !signin.nb64 || !signin.q || !signin.secret || signin.email !== email) {
      return {error: 'LOGIN_FAILED'};
    }
    const {r, q, secret} = signin;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    if (crServerVerify(fb64, r, q, secret)) {
      const rlogin = await ctxWs.db(async (db) => {
        return db.one<{ client_profile_id?: string, federated_login_id?: string }>(
          emailLoginSql,
          {login: email, result: '+pw'},
        );
      });
      if (!rlogin) {
        return {error: 'LOGIN_FAILED'};
      }
      ctxWs.user = {
        login: email,
        clientProfileId: rlogin.client_profile_id,
        federatedLoginId: rlogin.federated_login_id,
      };
      return {};
    } else {
      await ctxWs.db(async (db) => {
        return db.none(emailLoginFailedSql, {login: email, result: '-pw'});
      });
      return {error: 'LOGIN_FAILED'};
    }
  } catch (e) {
    console.error(e);
    return {error: 'EXCEPTION', e};
  }
}
