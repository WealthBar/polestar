import {tuidCtorType} from './tuid';
import {registryCtor} from './registry';

export type cancellationCallbackType = () => void;

export type cancellationTokenType = {
  onCancelRequested: (callback: cancellationCallbackType) => () => void,
  requestCancellation: () => void,
  isCancellationRequested: boolean,
  waitForCancellation: (timeoutMilliseconds?: number) => Promise<boolean>,
};

export type cancellationTokenCtorType = () => cancellationTokenType;
export type cancellationTokenCtorCtorType = (tuidCtor: tuidCtorType) => cancellationTokenCtorType;

export function cancellationTokenCtorCtor(tuidCtor: tuidCtorType): cancellationTokenCtorType {
  function cancellationTokenCtor(): cancellationTokenType {
    const cancellationCallbacks = registryCtor<cancellationCallbackType>();

    let isCancellationRequested = false;

    function onCancelRequested(callback: cancellationCallbackType): () => void {
      return cancellationCallbacks.register(tuidCtor(), callback);
    }

    function requestCancellation(): void {
      if (!isCancellationRequested) {
        cancellationCallbacks.valuesOrderedByKey.reverse().forEach((cb) => cb());
        cancellationCallbacks.clear();
        isCancellationRequested = true;
      }
    }

    // return false if timeout, true otherwise.
    async function waitForCancellation(timeoutMilliseconds?: number): Promise<boolean> {
      if (isCancellationRequested) {
        return true;
      }
      return new Promise(r => {
        const unsub = onCancelRequested(() => {
          r(true);
        });
        if (timeoutMilliseconds) {
          setTimeout(() => {
              unsub();
              r(false);
            },
            timeoutMilliseconds,
          );
        }
      });
    }

    return {
      onCancelRequested,
      requestCancellation,
      waitForCancellation,
      get isCancellationRequested(): boolean {
        return isCancellationRequested;
      },
    };
  }

  return cancellationTokenCtor;
}
