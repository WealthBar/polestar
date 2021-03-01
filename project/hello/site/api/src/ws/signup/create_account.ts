import {ctxWsType} from 'node_core';
import {serializableType} from 'ts_agnostic';
import {crServerSetup} from 'node_core';
import {value as createAccountSql} from './create_account_sql';
import {normalizeEmail} from './normalize_email';

export async function wsCreateAccount(ctxWs: Pick<ctxWsType, 'session' | 'db' | 'remoteAddress' | 'user'>, params: serializableType): Promise<serializableType> {
  console.log('wsCreateAccountSetupInit', params);
  const p = params as { login?: string, code?: string, hpnb64?: string, locale?: string, partnerChannel?: string };
  if (!p || !p.login || !p.code || !p.hpnb64) {
    return {error: 'INVALID_PARAMETERS'};
  }
  const {login, code, hpnb64} = p;
  const locale = p.locale || 'en';
  const partnerChannel = p.partnerChannel || '';
  const normalizedLogin = normalizeEmail(login);

  const signup = ctxWs.session.signup as { verify?: { login?: string, code?: string, nb64?: string } };
  if (signup && signup.verify) {
    const verify = signup.verify;
    if (verify.login === login && verify.code === code && verify.nb64) {
      const {q} = crServerSetup(hpnb64);
      const {
        client_profile_id: clientProfileId,
        federated_login_id: federatedLoginId,
      } = await ctxWs.db(
        async db => {
          return db.one(createAccountSql, {
            login,
            normalizedLogin,
            q,
            n: verify.nb64,
            locale,
            partnerChannel,
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



