export function rateLimitCtor(getTime: () => number, setTimeout: (f: ()=>void, ms: number) => number) {
  return function rateLimit(ms: number, f: () => void): () => void {
    let last = getTime() - ms;
    let timeoutHandle: number | undefined;
    return () => {
      if (timeoutHandle) {
        return; // f() already scheduled to run in the future.
      }
      const now = getTime();
      const since = now - last;
      if (since < ms) { // too soon, schedule to run in the future
        timeoutHandle = setTimeout(() => {
          f();
          last = getTime(); // update to time when called.
          timeoutHandle = undefined;
        }, ms - since);
      } else {
        last = now;
        f(); // long enough since last call, call f() directly.
      }
    };
  };
}

export const rateLimit = rateLimitCtor(() => +Date.now(), window.setTimeout);
