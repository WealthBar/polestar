import * as assert from 'assert';
import {registryCtor, readonlyRegistryCtor} from './registry';

describe('readonlyRegistryCtor', () => {
  it('Basics', () => {
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
    const mk2 = mk();

    const readonlyRegistry = readonlyRegistryCtor<{ id: string, value: number }>([['1', mk1], ['2', mk2]]);

    assert.strictEqual(readonlyRegistry.lookup('1'), mk1);
    assert.strictEqual(readonlyRegistry.lookup('2'), mk2);
    assert(readonlyRegistry.lookup('3') === undefined);
    
    assert.deepStrictEqual(readonlyRegistry.valuesOrderedByKey, [mk1, mk2]);

    const values = readonlyRegistry.values;
    assert(values.length === 2);
    assert(values.includes(mk1));
    assert(values.includes(mk2));

    const names = readonlyRegistry.names;
    assert(names.length === 2);
    assert(names.includes('1'));
    assert(names.includes('2'));

    assert.strictEqual(readonlyRegistry.signature, '5460f49adbe7aba2');
  });
});

describe('registryCtor', () => {
  it('Basics', () => {
    const registry = registryCtor<{ id: string, value: number }>();
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
    const us1 = registry.register('1', mk1);
    const mk2 = mk();
    const us2 = registry.register('2', mk2);

    assert.strictEqual(registry.lookup('1'), mk1);
    assert.strictEqual(registry.lookup('2'), mk2);
    assert(registry.lookup('3') === undefined);

    const names = registry.names;
    assert(names.length === 2);
    assert(names.includes('1'));
    assert(names.includes('2'));

    assert.deepStrictEqual(registry.valuesOrderedByKey, [mk1, mk2]);
    const values = registry.values;
    assert(values.length === 2);
    assert(values.includes(mk1));
    assert(values.includes(mk2));

    const s12 = registry.signature;
    assert(registry.signature);
    us1();
    const s2 = registry.signature;
    assert.notStrictEqual(s12, s2);
    assert(registry.lookup('1') === undefined);

    const mk3 = registry.remove('2');
    assert.strictEqual(mk2, mk3);

    const us3 = registry.register('2', mk1);
    us2(); // no effect since "2" doesn't point to mk2 anymore.
    assert.strictEqual(registry.lookup('2'), mk1);

    us3(); // removes '2'/mk1
    assert(registry.values.length === 0);
  });

  it('lock', () => {
    const registry = registryCtor<string>();
    const us = registry.register('x', 'y');
    registry.lock();
    try {
      registry.register('a', 'b');
      assert.fail();
    } catch (e) {
      assert.strictEqual(e.toString(),'Error: Locked');
    }
    try {
      registry.remove('x');
      assert.fail();
    } catch (e) {
      assert.strictEqual(e.toString(),'Error: Locked');
    }
    try {
      registry.clear();
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
    const registry = registryCtor<string>();
    registry.register('1', 'x');
    try {
      registry.register('1', 'y');
      assert.fail('should throw');
    } catch (e) {
      assert(e.error === 'DUPLICATE');
      assert(e.name === '1');
    }
  });
});
