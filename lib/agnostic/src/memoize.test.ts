import * as assert from 'assert';
import {memoize} from './memoize';

describe('memoize', () => {
  it('calls once', () => {
    let c:number = 0;

    function f() {
      c += 1;
    }

    const g = memoize(f);

    assert(c === 0);

    g();
    // the linter sucks and assumes g() is pure and won't touch c. :(
    // @ts-ignore
    assert(c === 1);

    g();
    assert(c === 1);
  });
});
