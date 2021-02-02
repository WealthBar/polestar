import {rpc} from '@/rpc';

export type userListType = { userId?: string, displayName?: string }[] | undefined;

export async function rpcUserList(): Promise<userListType> {
  return (await rpc?.call('userList'))?.userList as unknown as userListType;
}
