import * as assert from 'assert';
import {registryCtor} from './registry';

describe('registry', () => {
  it('basics', () => {
    const r = registryCtor<{ id: string, value: number }>();
    let id = 0;
    let value = 100;
    const mk = function () {
      return {
        id: `x${id++}`,
        value: value++,
        toString() {
          return `${this.id} ${this.value}`;
        },
      };
    };

    const mk1 = mk();
    const us1 = r.register('1', mk1);
    const mk2 = mk();
    const us2 = r.register('2', mk2);

    assert.strictEqual(r.lookup('1'), mk1);
    assert.strictEqual(r.lookup('2'), mk2);
    assert(r.lookup('3') === undefined);

    const names = r.names;
    assert(names.length === 2);
    assert(names.includes('1'));
    assert(names.includes('2'));

    assert.deepStrictEqual(r.valuesOrderedByKey, [mk1, mk2]);
    const values = r.values;
    assert(values.length === 2);
    assert(values.includes(mk1));
    assert(values.includes(mk2));

    const s12 = r.signature;
    assert(r.signature);
    us1();
    const s2 = r.signature;
    assert.notStrictEqual(s12, s2);
    assert(r.lookup('1') === undefined);

    const mk3 = r.remove('2');
    assert.strictEqual(mk2, mk3);

    const us3 = r.register('2', mk1);
    us2(); // no effect since "2" doesn't point to mk2 anymore.
    assert.strictEqual(r.lookup('2'), mk1);

    us3(); // removes '2'/mk1
    assert(r.values.length === 0);
  });

  it('lock', () => {
    const r = registryCtor<string>();
    const us = r.register('x', 'y');
    r.lock();
    try {
      r.register('a', 'b');
      assert.fail();
    } catch (e) {
      assert.strictEqual(e.toString(),'Error: Locked');
    }
    try {
      r.remove('x');
      assert.fail();
    } catch (e) {
      assert.strictEqual(e.toString(),'Error: Locked');
    }
    try {
      r.clear();
      assert.fail();
    } catch (e) {
      assert.strictEqual(e.toString(),'Error: Locked');
    }
    try {
      us();
      assert.fail();
    } catch (e) {
      assert.strictEqual(e.toString(),'Error: Locked');
    }
  });

  it('no duplicate keys', () => {
    const r = registryCtor<string>();
    r.register('1', 'x');
    try {
      r.register('1', 'y');
      assert.fail('should throw');
    } catch (e) {
      assert(e.error === 'DUPLICATE');
      assert(e.name === '1');
    }
  });
});
