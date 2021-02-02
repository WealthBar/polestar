// timeSource should return milliseconds from an epoch (any epoch will do since we use the relative amount).
export function debounceCtor(timeSource: () => number) {
  return function <TP, TR>(ms: number, func: (p: TP) => TR): (p: TP) => TR | undefined {
    let lastTime: number | undefined;
    return function (p: TP): TR | undefined {
      const now = timeSource();
      if ((lastTime === undefined) || (now - lastTime >= ms)) {
        lastTime = now;
        return func(p);
      }
    };
  };
}

export const debounce = debounceCtor(() => +Date.now());

export function debounceAsyncCtor(timeSource: () => number) {
  return function <TP, TR>(ms: number, func: (p: TP) => Promise<TR | void>): (p: TP) => Promise<TR | void> {
    let lastTime: number | undefined;
    return async function (p: TP): Promise<TR | void> {
      const now = timeSource();
      if ((lastTime === undefined) || (now - lastTime >= ms)) {
        lastTime = now;
        return func(p);
      }
    };
  };
}

export const debounceAsync = debounceAsyncCtor(() => +Date.now());
