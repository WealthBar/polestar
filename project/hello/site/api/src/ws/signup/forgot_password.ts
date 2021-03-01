import {crServerSetupInit, ctxWsType} from 'node_core';
import {serializableType} from 'ts_agnostic';

export async function wsForgotPassword(ctxWs: Pick<ctxWsType, 'session' | 'user'>, params: serializableType): Promise<serializableType> {
  console.log('wsForgotPassword', params);
  try {
    const p = params as { login: string };
    if (!p || !p.login) {
      return {error: 'INVALID_PARAMETERS'};
    }
    const {login} = p;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const code = [1, 2, 3, 4, 5, 6, 7, 8].map(_ => Math.trunc(Math.random() * 10).toString()).join('');
    const {nb64} = crServerSetupInit();
    ctxWs.session.signup = {verify: {login, code, nb64}};
    ctxWs.user = undefined; // clear user info to prevent new signup from associating with the user currently logged in.
    console.log('todo: send code to login', login, code);
    return {nb64};
  } catch (e) {
    console.error(e);
    return {error: 'EXCEPTION', e};
  }
}
