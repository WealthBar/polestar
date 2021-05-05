import '@/vue_comp';
import {ws} from '@/ws';
import {woOpResultType, woOpType} from "ts_workorder";
import {callTrackerCtor} from "vue_workflow";

const delayTimeMilliseconds = 100;
const wsWoV1Test = ws.callCtor<woOpType, woOpResultType>('wo/v1/test');
const wsWfV1FlowInfo = ws.callCtor<{ stoken: string, },
  {
    formRequestId: string,
    flowName: string,
    brandName: string,
    localeName: string,
  }>('wf/v1/flowInfo');

export const deps = {window};
const trackCall = callTrackerCtor(deps.window.setTimeout, delayTimeMilliseconds * 2);
const woTest = (woOp: woOpType): ReturnType<typeof wsWoV1Test> => trackCall(() => wsWoV1Test(woOp));
const wfFlowInfo = ({stoken}: { stoken: string }): ReturnType<typeof wsWfV1FlowInfo> => trackCall(() => wsWfV1FlowInfo({stoken}));

export const wsApp = {
    callsOutstanding: trackCall.callsOutstanding,
    flow: {
      test: woTest
    } as Record<string, (params: woOpType) => Promise<Partial<woOpResultType & { error: string }>>>,
    wfFlowInfo,
  }
;

