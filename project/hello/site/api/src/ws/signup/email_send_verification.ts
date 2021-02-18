import {crServerSetupInit, ctxWsType} from 'node_core';
import {serializableType} from 'ts_agnostic';

export async function wsEmailSendVerification(ctxWs: Pick<ctxWsType, 'session'>, params: serializableType): Promise<serializableType> {
  console.log('wsEmailStatus', params);
  try {
    const p = params as { email: string };
    if (!p || !p.email) {
      return {error: 'INVALID_PARAMETERS'};
    }
    const {email} = p;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const code = [1, 2, 3, 4, 5, 6, 7, 8].map(_ => Math.trunc(Math.random() * 10).toString()).join('');
    const {nb64} = crServerSetupInit();
    ctxWs.session.signup = {verify: {email, code, nb64}};
    console.log('todo: send code to email', email, code);
    return {nb64};
  } catch (e) {
    console.error(e);
    return {error: 'EXCEPTION', e};
  }
}
