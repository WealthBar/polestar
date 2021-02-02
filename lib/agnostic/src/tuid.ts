import {pad} from './pad';
// use the node backend version if you are on the backend, it'll be faster
// than this generic version.

let lastTime = 0;

const rhc = function rhc(p: string): string {
  const x = Math.random() * (16 ** p.length) | 0;
  return pad(p, x.toString(16));
};

export function tuidCtor(): string {
  let now = Date.now() * 1000; // microseconds
  if (now <= lastTime) {
    // because the JS time resolution isn't great we force time
    // forward to preserve generation order locally.
    now = lastTime + 1;
  }
  lastTime = now;

  const ts = pad('0000000000000000', now.toString(16));
  const a = ts.substr(0, 8);
  const b = ts.substr(8, 4);
  const c = ts.substr(12, 3);
  const d = ts.substr(15, 1);
  const e = rhc('00');
  const f = rhc('0000');
  const g = rhc('0000');
  const h = rhc('0000');
  return `${a}-${b}-4${c}-8${d}${e}-${f}${g}${h}`;
}

export type tuidCtorType = typeof tuidCtor;

export function isTuid(value: string): boolean {
  return !!value.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
}

export function tuidEpochMicro(value: string): number|undefined {
  const m = value.match(/^([0-9a-f]{8})-([0-9a-f]{4})-4([0-9a-f]{3})-[89ab]([0-9a-f])[0-9a-f]{2}-[0-9a-f]{12}$/i);
  if (!m) { return; }
  const hex = m[1]+m[2]+m[3]+m[4];
  return Number.parseInt(hex, 16);
}

export const tuidZero = '00000000-0000-0000-0000-000000000000';
// istanbul ignore next
export function tuidCtorForTesting(start = 0): () => string {
  return () => {
    const h = pad('000000000000', (start++).toString(16));
    return `00000000-4000-8000-0000-${h}`;
  };
}
