import {rpc} from '@/rpc';

export type colabUserContextListType =  { userId?: string, displayName?: string, route?: string, contextName?: string, lastSeen?: string }[] | undefined;

export async function rpcColabUserContextList(): Promise<colabUserContextListType> {
  return (await rpc?.call('colabUserContextList'))?.userContextList as unknown as colabUserContextListType;
}
