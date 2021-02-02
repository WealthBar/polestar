import {connectionInfoType, wsCtxType} from '../../../../../../lib/backend/src/ws_rpc_server/ws_rpc_server.type';
import {serializableType} from '../../../../../../lib/agnostic/src/serialize';
import {registryType} from '../../../../../../lib/agnostic/src/registry';
import {vivify} from '../../../../../../lib/agnostic/src/vivify';
import {DateTime} from 'luxon';

export async function colabSetContextWsCall(ctx: wsCtxType, params: serializableType, connections: registryType<connectionInfoType>): Promise<serializableType | undefined> {
  const connection = connections.lookup(ctx.requestId);
  if (!connection || !params.contextName || !ctx.userId) {
    return;
  }
  const colab = vivify(connection.meta, 'colab', {});
  colab.contextName = params.contextName;
  colab.route = params.route;
  colab.lastSeen = DateTime.utc();
  const calls: Promise<serializableType | undefined>[] = [];
  for (const conn of connections.values) {
    if (conn.ctx.requestId == ctx.requestId) {
      continue;
    }
    const c = !conn?.meta?.colab;
    if (!c) {
      continue;
    }
    calls.push(conn.call('colabNotify', {
      userId: ctx.userId,
      displayName: ctx.sessionInfo.displayName || '-',
      contextName: colab?.contextName,
      route: colab?.route,
      lastSeen: colab?.lastSeen.toISO(),
    }));
  }
  await Promise.all(calls);
}
