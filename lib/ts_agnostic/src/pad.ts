export function pad(p: string, s: string): string {
  const x = p + s;
  return x.substr(x.length - p.length);
}
