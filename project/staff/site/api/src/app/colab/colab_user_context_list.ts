import {serializableType} from '../../../../../../lib/agnostic/src/serialize';
import {connectionInfoType, wsCtxType} from '../../../../../../lib/backend/src/ws_rpc_server/ws_rpc_server.type';
import {registryType} from '../../../../../../lib/agnostic/src/registry';

export async function colabUserContextListWsCall(ctx: wsCtxType, params: serializableType, connections: registryType<connectionInfoType>): Promise<serializableType | undefined> {
  const userContextList: { userId: string, displayName: string, route: string, contextName: string, lastSeen: string }[] = [];
  for (const connection of connections.values) {
    const colab = connection.meta?.colab;
    if (colab && colab?.contextName && connection.ctx.userId) {
      userContextList.push({
        userId: connection.ctx.userId,
        displayName: connection.ctx.sessionInfo.displayName || '-',
        contextName: colab?.contextName,
        route: colab?.route,
        lastSeen: colab?.lastSeen.toISO(),
      });
    }
  }
  return {userContextList};
}

