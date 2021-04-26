import '@/vue_comp';
import {ws} from '@/ws';
import {reactive} from '@vue/composition-api';
import {woOpResultType, woOpType} from "vue_workflow/dist/api";

const delayTimeMilliseconds = 100;
const wsWoOp = ws.callCtor<woOpType, woOpResultType>('wo/v1/op');
const wsWfName = ws.callCtor<{ stoken: string }, { wfName: string }>('wf/v1/name');

const state = reactive(
  {
    callsOutstanding: 0,
  }
);


async function trackCall<T>(f: () => Promise<T>): Promise<T> {
  ++state.callsOutstanding;

  try {
    return await f();
  } catch (e) {
    console.error(e);
    throw e;
  } finally {
    // delay the decrement to help smooth out 1->0->1->0->1->0 flicker caused
    // by updates that are watching $wsOutstanding and updating UI elements
    if (state.callsOutstanding === 1) {
      setTimeout(() => --state.callsOutstanding, delayTimeMilliseconds * 2);
    } else {
      --state.callsOutstanding;
    }
  }
}

async function woOp(woOp: woOpType): Promise<Partial<woOpResultType>> {
  return trackCall(() => wsWoOp(woOp));
}

async function wfName({stoken}: { stoken: string }): Promise<Partial<{ wfName: string }>> {
  return trackCall(() => wsWfName({stoken}));
}

export const wsApp = {
  state,
  woOp,
  wfName,
};
