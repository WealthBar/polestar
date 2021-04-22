import {cloneDeep} from 'lodash';
import {serializableType} from 'ts_agnostic';

export type woStateType = {
  navHistory: string[],
  meta?: Record<string, Record<string, serializableType>>,
  step?: Record<string, Record<string, serializableType>>,
  contentHash?: string,
  signUrl?: string,
};

type woCacheEntryType = {
  byContentHash: Record<string, woStateType>,
  woId: string,
  currentContentHash: string,
  frozenAt?: string,
  computed?: Record<string, serializableType>,
};

export type woOpType = {
  contextName: string,
} & (
  {
    op: 'UPDATE' | 'SIGN' | 'COMMIT' | 'ABORT',
    states?: woStateType[],
  } | {
  op: 'RESUME',
  contentHash?: string,
}
  );

export type woMetadataType = {
  contextName: string,
  currentContentHash: string,
  woId: string,
  frozenAt?: string,
  computed?: Record<string, serializableType>,
};

export type woOpResultType = {
  res?: {
    states: woStateType[],
    metadata: woMetadataType,
  };
  err?: string;
} | undefined;

export function woApiCtor(remoteCall: (op: woOpType) => Promise<woOpResultType>): (op: woOpType) => Promise<woOpResultType> {
  const woCache: Record<string, woCacheEntryType> = {};
  return async function woApi(op: woOpType): Promise<woOpResultType> {
    // check in cache first.
    if (op.op === 'RESUME' && op.contentHash) {
      const woCacheEntry = woCache[op.contextName];
      const state = woCacheEntry?.byContentHash[op.contentHash];
      if (state) {
        return {
          res: {
            states: [cloneDeep(state)],
            metadata: {
              computed: woCacheEntry.computed,
              contextName: op.contextName,
              frozenAt: woCacheEntry.frozenAt,
              currentContentHash: woCacheEntry.currentContentHash,
              woId: woCacheEntry.woId,
            },
          },
        };
      }
    }

    if (['COMMIT', 'ABORT', 'SIGN'].includes(op.op)) {
      // on commit we clear all other versions from the cache and only retain the committed wo/computed returned.
      delete woCache[op.contextName];
    }

    const result = await remoteCall(op);

    if (!result?.res || result.err) {
      return {err: result?.err || 'ERROR_UNKNOWN'};
    }

    function updateCacheEntry(wom: woMetadataType, wos: woStateType) {
      const contentHash = wos.contentHash;
      const contextName = wom.contextName;

      if (!contextName || !contentHash) {
        return result;
      }
      if (!woCache[contextName]) {
        woCache[contextName] = {
          byContentHash: {[contentHash]: cloneDeep(wos)},
          woId: wom.woId,
          currentContentHash: wom.currentContentHash,
        };
      } else {
        const woCacheEntry = woCache[contextName];
        woCacheEntry.byContentHash[contentHash] = cloneDeep(wos);
        woCacheEntry.woId = wom.woId;
        woCacheEntry.currentContentHash = wom.currentContentHash;
      }
    }

    const res = result.res;

    res.states.forEach(wos => {
      updateCacheEntry(res.metadata, wos);
    });


    return result;

  };
}

export type woApiType = ReturnType<typeof woApiCtor>;
