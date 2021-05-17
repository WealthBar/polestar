import {limitedMemoFCtor} from 'ts_agnostic';
import {ws} from '@/ws';
import {callTrackerCtor} from "vue_workflow";

const delayTimeMilliseconds = 100;

export const deps = {window};

const tracker = callTrackerCtor(deps.window.setTimeout, delayTimeMilliseconds * 2);

const wsWhoAmI = ws.callCtor<Record<string, never>, { login: string }>('app/whoAmI');
const whoAmI = limitedMemoFCtor(15000, wsWhoAmI, () => '_');

export const wsApp = {
  callsOutstanding: tracker.callsOutstanding,
  whoAmI,
};
