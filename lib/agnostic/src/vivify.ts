export function vivify<T>(obj: Record<string, T>, key: string, defaultValue: T): T {
  if (!Object.prototype.hasOwnProperty.call(obj, key)) {
    obj[key] = defaultValue;
  }
  return obj[key];
}
