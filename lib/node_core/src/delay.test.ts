import {delay} from './delay';
import * as assert from 'assert';

describe('delay', () => {
  it('delays by the correct amount', async () => {
    const start = Date.now();
    await delay(100);
    const end = Date.now();
    const diff = end - start;

    assert(diff < 110);
    assert(diff >= 100);
  });
});
