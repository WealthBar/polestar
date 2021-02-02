import {connectionInfoType, wsCtxType} from '../../../../../../lib/backend/src/ws_rpc_server/ws_rpc_server.type';
import {serializableType} from '../../../../../../lib/agnostic/src/serialize';
import {registryType} from '../../../../../../lib/agnostic/src/registry';
import {dbProviderWithUserBoundType} from '../../../../../../lib/backend/src/db';
import {value as userListSql} from './user_list_sql';

export async function userList(dbProvider: dbProviderWithUserBoundType): Promise<serializableType|undefined> {
  return await dbProvider(async db => {
    const rows = await db.manyOrNone(userListSql);
    const userList: { displayName: string; userId: string }[] = rows.map(x => ({
      userId: x.user_id,
      displayName: x.display_name,
    }));
    return {userList};
  });
}

export async function userListWsCall(ctx: wsCtxType, params: serializableType, connections: registryType<connectionInfoType>): Promise<serializableType|undefined> {
  return userList(ctx.dbProvider);
}

