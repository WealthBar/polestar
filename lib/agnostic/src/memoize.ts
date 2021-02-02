export function memoize<T>(f: () => T): () => T {
  let t: T;
  let first = true;
  return () => {
    if (first) {
      t = f();
      first = false;
    }
    return t;
  };
}
