import * as assert from 'assert';
import {deserialize, serialize} from './serialize';

describe('serialize', () => {
  it('serialize', () => {
    assert.strictEqual(serialize({a:1}), '{"a":1}')
  });
  it('deserialize', () => {
    assert.deepStrictEqual(deserialize('{"a":1}'), {a: 1})
  });
});
