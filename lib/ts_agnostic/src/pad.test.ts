import * as assert from 'assert';
import {pad} from './pad';

describe('pad', () => {
  it('basics', () => {
    assert.strictEqual(pad("000","a"),"00a");
  });
});
