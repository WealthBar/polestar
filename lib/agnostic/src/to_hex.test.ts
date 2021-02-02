import * as assert from 'assert';
import {toHex} from './to_hex';

describe('toHex', () => {
  it('basics', () => {
    assert.strictEqual(toHex(1, 4), '0001');
    assert.strictEqual(toHex(32), '0000000000000020');
  });
});
