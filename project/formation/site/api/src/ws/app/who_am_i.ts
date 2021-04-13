import {ctxWsType} from 'node_core';
import {serializableType} from 'ts_agnostic';

export async function wsAppWhoAmI(ctxWs: Pick<ctxWsType, 'user'>, params: serializableType): Promise<serializableType> {
  return { login: ctxWs?.user?.login};
}
