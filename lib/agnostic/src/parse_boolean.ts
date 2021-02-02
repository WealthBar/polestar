export function parseBoolean(value: boolean | string | number | null | undefined): boolean {
  // already a boolean?
  if (value === true || value === false) {
    return value;
  }
  // null, undefined, 0
  if (!value) {
    return !!value; // force to boolean
  }
  return ['y', 't', '1'].includes(('' + value).replace(' ', '').toLowerCase()[0]);
}
