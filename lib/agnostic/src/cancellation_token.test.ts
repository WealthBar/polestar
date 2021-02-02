import * as assert from 'assert';
import {cancellationTokenCtorCtor} from './cancellation_token';
import {tuidCtorForTesting} from './tuid';

const testTuidCtor = tuidCtorForTesting(0);
const cancellationTokenCtor = cancellationTokenCtorCtor(testTuidCtor);

describe('cancellationToken', () => {
  it('called the onCancellationCallbacks in the right order', () => {
    const ct = cancellationTokenCtor();
    let callCount = 0;

    ct.onCancelRequested(() => {
      assert.strictEqual(callCount, 1);
      ++callCount;
    });

    ct.onCancelRequested(() => {
      assert.strictEqual(callCount, 0);
      ++callCount;
    });

    assert.strictEqual(callCount, 0);
    assert(!ct.isCancellationRequested);
    ct.requestCancellation();

    assert.strictEqual(callCount, 2);

    assert(ct.isCancellationRequested);

    ct.requestCancellation();

    assert.strictEqual(callCount, 2);
  });

  it('waitForCancellation', async () => {
    const ct = cancellationTokenCtor();

    let c = 0;
    ct.onCancelRequested(() => {
      c += 1;
    });

    assert(!ct.isCancellationRequested);

    {
      const cancelled = await ct.waitForCancellation(1);
      assert(!cancelled);
    }

    let waitForCancellationRun = false;
    const task = (async ()=>{
      assert(!ct.isCancellationRequested);
      const cancelled = await ct.waitForCancellation();
      assert(cancelled);
      assert(ct.isCancellationRequested);
      waitForCancellationRun = true;
    })();

    ct.requestCancellation();
    await task;

    assert(waitForCancellationRun);

    assert(c === 1);

    assert(ct.isCancellationRequested);

    {
      const cancelled = await ct.waitForCancellation(1000);
      assert(cancelled);
    }

    assert(c === 1);
  });
});
