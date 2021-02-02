export function toHex(x: number, n = 16): string {
  const s = x.toString(16);
  const p = '0'.repeat(n);
  const c = p + s;
  return c.substr(c.length - p.length);
}
