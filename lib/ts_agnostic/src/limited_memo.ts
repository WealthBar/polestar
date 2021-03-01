export type limitedMemoFCtorType = <TP, TR>(
  maxTimeToHoldResultForMs: number,
  f: (params: TP) => Promise<TR>, // function to wrap
  toKey: (params: TP) => string, // function to convert parameters to the memoization key
) => (
  (params: TP) => Promise<TR> // returning the wrapped function
  ) & {
  invalidate();
  clear();
};

// dep wrapper, return a limitedMemoFCtor
export function limitedMemoFCtorCtor(
  getTime: () => number,
): limitedMemoFCtorType {
  function limitedMemoFCtor<TP, TR>(
    maxTimeToHoldResultForMs: number,
    f: (params: TP) => Promise<TR>,
    toKey: (params: TP) => string,
  ): ((params: TP) => Promise<TR>) & { invalidate(); clear(); } {
    // using let allows clear to wholesale replace the memos
    let memos: { [key: string]: { at: number; r: TR } } = {};

    async function limitedMemoF(params: TP): Promise<TR> {
      const key = toKey(params);
      const now = getTime();
      // if we're got a recent result
      if (memos[key] && (now - memos[key].at < maxTimeToHoldResultForMs)) {
        return memos[key].r; // result the recent result
      }
      // get a new result
      const r = await f(params);
      // memoize it
      memos[key] = {
        r,
        at: getTime(),
      };
      // return it
      return r;
    }

    limitedMemoF.clear = () => {
      memos = {};
    };

    limitedMemoF.invalidate = () => {
      const now = getTime();
      for (const key of Object.keys(memos)) {
        // out with the old
        if ((now - memos[key].at) > maxTimeToHoldResultForMs) {
          delete memos[key];
        }
      }
    };
    return limitedMemoF;
  }
  return limitedMemoFCtor;
}

export const limitedMemoFCtor = limitedMemoFCtorCtor(() => +Date.now());

// example usage:
//
// async function foo(params: { bar: string }): Promise<string> {
//   return `bar: ${new Date()}`;
// }
//
// const limitedFoo = limitedMemoFCtor(
//   15000,
//   foo,
//   params => params.bar,
// );
//
// async function eg() {
//   let fooForX = await limitedFoo({bar: 'x'}); // call foo
//   fooForX = await limitedFoo({bar: 'x'}); // used cached value
//   // ...
//   limitedFoo.invalidate();
//   // ...
//   limitedFoo.clear();
// }
