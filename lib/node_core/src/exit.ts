// istanbul ignore file
// -- bootstrap

import {tuidCtor} from './tuid';
import {cancellationTokenCtorCtor} from 'ts_agnostic/src/cancellation_token';

let exitResolve: (value: unknown) => void | undefined;
export const exitCancellationToken = cancellationTokenCtorCtor(tuidCtor)();

export const exitPromise = new Promise((r: (value: unknown) => void) => {
  exitResolve = r;
}).then((value: unknown) => {
  exitCancellationToken.requestCancellation();
});

function onStop() {
  exitResolve?.(0);
}

process.on('SIGINT', onStop);
process.on('SIGTERM', onStop);
