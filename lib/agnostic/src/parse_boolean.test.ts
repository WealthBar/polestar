import * as assert from 'assert';
import {parseBoolean} from './parse_boolean';

describe('parseBoolean', () => {
  it('true cases', () => {
    [true, 1, 'true', 'yes', 'Y', 'T'].forEach(v => {
      assert(parseBoolean(v), `${v}`);
    });
  });
  it('false cases', () => {
    [false, 0, 'false', 'no', 'N', 'F', null, undefined].forEach(v => {
      assert(!parseBoolean(v), `${v}`);
    });
  });
});
