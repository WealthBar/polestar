import {ctxWsType} from 'node_core';
import {serializableType} from 'ts_agnostic';
import {crServerSetup} from 'node_core';
import {normalizeEmail} from './normalize_email';
import {value as changePasswordSql} from './change_password_sql';

export async function wsChangePassword(ctxWs: Pick<ctxWsType, 'session' | 'db' | 'remoteAddress' | 'user'>, params: serializableType): Promise<serializableType> {
  console.log('wsChangePassword', params);
  const p = params as { login?: string, code?: string, hpnb64?: string, nb64?: string};
  if (!p || !p.login || !p.code || !p.hpnb64 || !p.nb64) {
    return {error: 'INVALID_PARAMETERS'};
  }
  const {login, code, hpnb64, nb64} = p;
  const normalizedLogin = normalizeEmail(login);

  const signup = ctxWs.session.signup as { verify?: { login?: string, code?: string, nb64?: string } };
  if (signup && signup.verify) {
    const verify = signup.verify;
    if (verify.login === login && verify.code === code && verify.nb64 === nb64) {
      const {q} = crServerSetup(hpnb64);
      const {
        client_profile_id: clientProfileId,
        federated_login_id: federatedLoginId,
      } = await ctxWs.db(
        async db => {
          return db.one(changePasswordSql, {
            normalizedLogin,
            q,
            n: verify.nb64,
            remoteAddress: ctxWs.remoteAddress,
          });
        }) as { client_profile_id: string, federated_login_id: string };

      ctxWs.user = {
        login: login,
        clientProfileId,
        federatedLoginId,
      };
      return {};
    }
  }
  return {error: 'VERIFY_FAILED'};
}



