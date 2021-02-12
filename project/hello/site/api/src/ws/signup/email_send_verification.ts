import {ctxWsType} from 'node_core';
import {serializableType} from 'ts_agnostic';

export async function wsEmailSendVerification(ctxWs: Pick<ctxWsType, 'session'>, params: serializableType): Promise<serializableType> {
  console.log('wsEmailStatus', params);
  try {
    const p = params as { email: string };
    if (!p) {
      return {error: 'NO_EMAIL'};
    }
    const {email} = p;
    const code = [1, 2, 3, 4, 5, 6, 7, 8].map(_ => Math.trunc(Math.random() * 10).toString()).join('');
    ctxWs.session.signup = { verify: {email, code} };
    console.log('todo: send code to email', email, code);
  } catch (e) {
    console.error(e);
  }
  return {};
}
