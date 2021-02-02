export function vivifyUpdate<T>(obj: { [x: string]: T }, key: string, updater: (value: T) => T, defaultValue: T): T {
  if (!Object.prototype.hasOwnProperty.call(obj, key)) {
    obj[key] = defaultValue;
  }

  const newValue = updater(obj[key]);
  obj[key] = newValue;

  return newValue;
}
