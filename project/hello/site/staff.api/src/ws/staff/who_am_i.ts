import {ctxWsType} from 'node_core';
import {serializableType} from 'ts_agnostic';

export async function wsStaffWhoAmI(ctxWs: Pick<ctxWsType, 'user'>, params: serializableType): Promise<serializableType> {
  return { login: ctxWs?.user?.login};
}
