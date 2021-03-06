import * as assert from 'assert';
import {isTuid, tuidCtor, tuidEpochMicro} from './tuid';

describe('tuid', () => {
  it('increase', () => {
    const bt = Date.now() * 1000;
    const a = [
      tuidCtor(), tuidCtor(), tuidCtor(), tuidCtor(),
      tuidCtor(), tuidCtor(), tuidCtor(), tuidCtor(),
      tuidCtor(), tuidCtor(), tuidCtor(), tuidCtor(),
      tuidCtor(), tuidCtor(), tuidCtor(), tuidCtor(),
    ];
    const at = Date.now() * 1000 + 999;

    a.forEach(v => {
      assert(isTuid(v));
      const us = tuidEpochMicro(v);
      assert(us);
      assert(us >= bt);
      assert(us < at);
    });
    for (let i = 0; i < a.length - 1; ++i) {
      assert(a[i] < a[i + 1], `${a[i]} < ${a[i + 1]}`);
    }
  });
});
