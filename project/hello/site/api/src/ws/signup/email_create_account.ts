import {ctxWsType} from 'node_core';
import {serializableType} from 'ts_agnostic';
import {crServerSetup} from 'node_core';
import {value as emailCreateAccountSql} from './email_create_account_sql';

export async function wsEmailCreateAccount(ctxWs: Pick<ctxWsType, 'session' | 'db' | 'remoteAddress' | 'user'>, params: serializableType): Promise<serializableType> {
  console.log('wsEmailCreateAccountSetupInit', params);
  const p = params as { email?: string, code?: string, hpnb64?: string, locale?: string, partnerChannel?: string };
  if (!p || !p.email || !p.code || !p.hpnb64) {
    return {error: 'INVALID_PARAMETERS'};
  }
  const {email, code, hpnb64} = p;
  const locale = p.locale || 'en';
  const partnerChannel = p.partnerChannel || '';

  const signup = ctxWs.session.signup as { verify?: { email?: string, code?: string, nb64?: string } };
  if (signup && signup.verify) {
    const verify = signup.verify;
    if (verify.email === email && verify.code === code && verify.nb64) {
      const {q} = crServerSetup(hpnb64);
      const {
        client_profile_id: clientProfileId,
        federated_login_id: federatedLoginId,
      } = await ctxWs.db(
        async db => {
          return db.one(emailCreateAccountSql, {
            email,
            q,
            n: verify.nb64,
            locale,
            partnerChannel,
            remoteAddress: ctxWs.remoteAddress,
          });
        }) as { client_profile_id: string, federated_login_id: string };

      ctxWs.user = {
        login: email,
        clientProfileId,
        federatedLoginId,
      };
      return {};
    }
  }
  return {error: 'VERIFY_FAILED'};
}



