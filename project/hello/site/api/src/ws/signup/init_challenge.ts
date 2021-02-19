import {crGetSalt, crServerInitChallenge, ctxWsType} from 'node_core';
import {serializableType} from 'ts_agnostic';
import {value as nqByLoginSql} from './nq_by_login_sql';
import {randomBytes} from 'crypto';

export async function wsInitChallenge(ctxWs: Pick<ctxWsType, 'session' | 'db'>, params: serializableType): Promise<serializableType> {
  console.log('wsInitChallenge', params);
  try {
    const p = params as { login: string };
    if (!p || !p.login) {
      return {error: 'INVALID_PARAMETERS'};
    }
    const {login} = p;

    const rnq = await ctxWs.db(async db => {
      return db.oneOrNone<{ n?: string, q?: string }>(nqByLoginSql, {login});
    });
    if (!rnq || !rnq.n || !rnq.q) {
      return {error: 'INVALID_PARAMETERS'};
    }
    const {n, q} = rnq;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const secret = randomBytes(32).toString('base64');
    const {r} = crServerInitChallenge(secret);
    ctxWs.session.signin = {login, r, nb64: n, q, secret};
    return {r, nb64: n, salt: crGetSalt(q)};
  } catch (e) {
    console.error(e);
    return {error: 'EXCEPTION', e};
  }
}
