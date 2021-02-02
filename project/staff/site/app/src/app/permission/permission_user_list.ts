import {rpc} from '@/rpc';

export type permissionUserListType = {
  userId?: string;
  userPermission: {
    permissionId?: string;
    permissionName?: string;
    relationType?: string;
  }[];
  userPermissionGroups: {
    permissionGroupName?: string;
    permissionList: {
      permissionName?: string;
      relationType?: string;
    }[];
  }[];
  resolved?: { [permissionName: string]: boolean };
} | undefined;

export async function rpcPermissionUserList(userId: string): Promise<permissionUserListType> {
  return (await rpc?.call('permissionUserList', {userId}))?.permissionUserList as unknown as permissionUserListType;
}
