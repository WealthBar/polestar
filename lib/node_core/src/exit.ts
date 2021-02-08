// istanbul ignore file
// -- bootstrap

import {tuidCtor} from './tuid';
import {cancellationTokenCtorCtor} from 'ts_agnostic';

let exitResolve: (value: unknown) => void | undefined;
export const exitCancellationToken = cancellationTokenCtorCtor(tuidCtor)();

export const exitPromise = new Promise((r: (value: unknown) => void) => {
  exitResolve = r;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
}).then((_: unknown) => {
  exitCancellationToken.requestCancellation();
});

function onStop() {
  exitResolve?.(0);
}

process.on('SIGINT', onStop);
process.on('SIGTERM', onStop);
