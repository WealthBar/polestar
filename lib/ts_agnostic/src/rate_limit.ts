export function rateLimitCtor(
  getTime: () => number,
  setTimeout: (f: () => void, delayBetweenCallsMs: number) => number
) {
  return function rateLimit(delayBetweenCallsMs: number, f: () => void): () => void {
    let last = getTime() - delayBetweenCallsMs;
    let timeoutHandle: number | undefined;

    const rateLimitedF = () => {
      if (timeoutHandle) {
        return; // f() already scheduled to run in the future.
      }
      const now = getTime();
      const since = now - last;
      if (since < delayBetweenCallsMs) { // too soon, schedule to run in the future
        timeoutHandle = setTimeout(() => {
          f();
          last = getTime(); // update to time when called.
          timeoutHandle = undefined;
        }, delayBetweenCallsMs - since);
      } else { // long enough since last call, call f() directly.
        last = now;
        f(); 
      }
    };
    return rateLimitedF;
  };
}

export function rateLimitEmitLastCtor(
  getTime: () => number,
  setTimeout: (f: () => void, ms: number) => number,
) {
  // rateLimitEmitLast wraps an async function f and "rate limits" calls to it
  // ensures f is called at most once every delayBetweenCallsMs
  // ensures the last call made to rateLimitedF in the last delayBetweenCallsMs is the one forwarded to callF
  function rateLimitEmitLast<TP, TR>(
    delayBetweenCallsMs: number,
    f: (params: TP) => Promise<TR>,
    callback: (last: TR) => void
  ): (params: TP) => void {
    let last = getTime() - delayBetweenCallsMs;
    let timeoutHandle: number | undefined;
    let lastParams: TP;
    let lastParamsVersion = 0;

    // create the wrapped form of f to return later
    async function rateLimitedF(params: TP) {
      console.log(params);

      lastParams = params; // track last params asked for
      ++lastParamsVersion; // and a version

      if (timeoutHandle) {
        return; // f already scheduled to run in the future.
      }

      const now = getTime();
      const since = now - last;

      // since this is a recursive timeout call we name it
      const callF = async () => {
        const paramsVersionIssued = lastParamsVersion;
        callback(await f(lastParams));
        last = getTime(); // update to time when last call completed.

        console.log('  paramsVersionIssued: ' + paramsVersionIssued);
        console.log('  lastParamsVersion: ' + lastParamsVersion);

        if (paramsVersionIssued !== lastParamsVersion) {
          // edge case, lastParams was updated while we waited on f to complete
          // so schedule another call to f for later using those params (or newer ones)
          timeoutHandle = setTimeout(callF, delayBetweenCallsMs);
        } else {
          timeoutHandle = undefined;
        }
      };

      if (since < delayBetweenCallsMs) {
        // too soon, schedule to run in the future
        timeoutHandle = setTimeout(callF, delayBetweenCallsMs - since);
      } else {
        // callF NOW!
        await callF();
      }
    }
    return rateLimitedF;
  }
  return rateLimitEmitLast;
}
