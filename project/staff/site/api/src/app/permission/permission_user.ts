import {connectionInfoType, wsCtxType} from '../../../../../../lib/backend/src/ws_rpc_server/ws_rpc_server.type';
import {serializableType} from '../../../../../../lib/agnostic/src/serialize';
import {registryType} from '../../../../../../lib/agnostic/src/registry';
import {dbProviderWithUserBoundType} from '../../../../../../lib/backend/src/db';
import {value as permissionUserListSql} from './permission_user_list_sql';
import {resolvePermissions} from '../../../../../../lib/backend/src/db/db_permission';

type permissionUserListType = {
  userId: string;
  userPermission: {
    permissionName: string;
    relationType: string;
  }[];
  userPermissionGroup: {
    permissionGroupName: string;
    permissionList: {
      permissionName: string;
      relationType: string;
    }[];
  }[];
  resolved: { [permissionName: string]: boolean };
};

export async function permissionUserList(dbProvider: dbProviderWithUserBoundType, params: serializableType): Promise<serializableType | undefined> {
  const userId: string = params['userId'] as string;
  if (!userId) {
    throw 'MISSING_PARAM:userId';
  }

  return await dbProvider(async (db) => {
    const row = await db.oneOrNone(permissionUserListSql, {userId});

    if (!row) {
      return;
    }

    const resolved = row.permission_list ? resolvePermissions(row.permission_list): [];
    const permissionUserList: permissionUserListType = {
      userId,
      userPermission: row.user_permission_list,
      userPermissionGroup: row.user_permission_group_list,
      resolved: resolved,
    };

    return {permissionUserList};
  });
}

export async function permissionUserListWsCall(ctx: wsCtxType, params: serializableType, connections: registryType<connectionInfoType>): Promise<serializableType | undefined> {
  return permissionUserList(ctx.dbProvider, params);
}

