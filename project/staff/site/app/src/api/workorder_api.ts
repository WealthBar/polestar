import {clientServiceCall} from '.';
import {cloneDeep, last} from 'lodash';

export type workOrderStateType = {
  meta: {
    navHistory: string[],
    [key: string]: any,
  },
  step: { [key: string]: any },
  [key: string]: any,
};

export type workOrderType = {
  workOrderState: workOrderStateType,
  contextName: string,
  contentHash: string,
  currentContentHash: string,
  workOrderId: string,
  frozenAt?: string,
  computed: any,
};

// TODO: add frozen to cache and return to caller.
const workOrderCache: {
  [contextName: string]: {
    workOrderByContentHash: {
      [contentHash: string]: workOrderStateType,
    },
    workOrderId: string,
    currentContentHash: string,
    frozenAt?: string,
    computed?: any,
  },
} = {};


export async function workOrderApi(workOrderApiName: string, op:
  {
    op: 'RESUME',
    contextName: string,
    contentHash?: string,
  } | {
  op: 'UPDATE',
  contextName: string,
  stateList: workOrderStateType[],
} | {
  op: 'COMMIT',
  contextName: string,
  state: workOrderStateType,
} | {
  op: 'ABORT',
  contextName: string,
  contentHash: string,
}): Promise<{ workOrder?: workOrderType, workOrderList?: workOrderType[], err?: string[] } | undefined> {
  // check in cache first.
  if (op.op === 'RESUME' && op.contentHash) {
    const workOrderCacheEntry = workOrderCache[op.contextName];
    const workOrderState = workOrderCacheEntry?.workOrderByContentHash[op.contentHash];
    if (workOrderState) {
      const workOrder: workOrderType = {
        workOrderState,
        computed: workOrderCacheEntry.computed,
        contentHash: op.contentHash,
        contextName: op.contextName,
        frozenAt: workOrderCacheEntry.frozenAt,
        currentContentHash: workOrderCacheEntry.currentContentHash,
        workOrderId: workOrderCacheEntry.workOrderId,
      };
      return {workOrder};
    }
  }

  if (op.op === 'COMMIT' || op.op === 'ABORT') {
    // on commit we clear all other versions from the cache and only retain the committed workOrder/computed returned.
    delete workOrderCache[op.contextName];
  }

  const result = await clientServiceCall(workOrderApiName, op);

  if (result.workOrderList && !result.workOrder) {
    result.workOrder = last(result.workOrderList);
  }

  if (!result?.workOrder?.contextName) {
    return result;
  }
  const wo: workOrderType = result.workOrder;
  if (!workOrderCache[wo.contextName]) {
    // create the caching entry for the result.
    workOrderCache[wo.contextName] = {
      workOrderByContentHash: {[wo.contentHash]: wo.workOrderState},
      workOrderId: result.workOrder.workOrderId,
      currentContentHash: result.workOrder.contentHash,
    };
  }

  if (result.workOrderList) {
    const workOrderCacheEntry = workOrderCache[result.workOrder.contextName];
    for (const workOrder of result.workOrderList) {
      workOrderCacheEntry.workOrderByContentHash[workOrder.contentHash] = cloneDeep(workOrder);
    }
    workOrderCacheEntry.computed = cloneDeep(result.computed);
  } else {
    // update the cache entry with the result.
    const workOrder = result.workOrder;
    const workOrderCacheEntry = workOrderCache[workOrder.contextName];
    workOrderCacheEntry.workOrderByContentHash[workOrder.contentHash] = cloneDeep(workOrder);
    workOrderCacheEntry.computed = cloneDeep(result.computed);
  }
  return {workOrder: wo, workOrderList: result.workOrderList};
}
