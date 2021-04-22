import * as assert from 'assert';
import {limitedMemoFCtorCtor} from './limited_memo';

describe('limitedMemoFCtorCtor', () => {
  it('memoizes', async () => {
    const getTimeStub = () => getTimeStub.returnValue
    getTimeStub.returnValue = 0

    // The file under test exports limitedMemoFCtor
    // but in this case we need to do it ourselves so we can control time
    const limitedMemoFCtor = limitedMemoFCtorCtor(getTimeStub);
    const maxTimeToHoldResultForMs = 100;
    const fStub = (param) => {
      fStub.callCount++;
      return new Promise((r) => r('computer says ' + param));
    }
    fStub.callCount = 0;
    const toKeyStub = (param) => param + 'Key'

    // We call the constructor to get a memoized wrapper around fStub
    const limitedMemoF = limitedMemoFCtor(
      maxTimeToHoldResultForMs,
      fStub,
      toKeyStub,
    );
    assert.strictEqual(typeof limitedMemoF, 'function');

    // Okay, finally ready to test our memoized function
    assert.strictEqual(await limitedMemoF('foo'), 'computer says foo');
    assert.strictEqual(fStub.callCount, 1);

    // Call it again within the memoization timeframe...
    getTimeStub.returnValue = 10
    assert.strictEqual(await limitedMemoF('foo'), 'computer says foo');
    assert.strictEqual(fStub.callCount, 1);

    // and outside the memoization timeframe
    getTimeStub.returnValue = 200
    assert.strictEqual(await limitedMemoF('foo'), 'computer says foo');
    assert.strictEqual(fStub.callCount, 2);

    // If we call with a different param, limitedMemoF will end up with two results memoized
    assert.strictEqual(await limitedMemoF('bar'), 'computer says bar');
    assert.strictEqual(fStub.callCount, 3);

    // If we clear the memos, they're all gone
    limitedMemoF.clear();
    assert.deepStrictEqual(limitedMemoF.internal.memos, {});

    // In order to test invalidate(), we'll set up two memos at different times
    assert.strictEqual(await limitedMemoF('foo'), 'computer says foo');
    assert.strictEqual(fStub.callCount, 4);
    getTimeStub.returnValue = 250
    assert.strictEqual(await limitedMemoF('bar'), 'computer says bar');
    assert.strictEqual(fStub.callCount, 5);

    // Let's jump forward so we're past the valid period for foo
    // but within the valid period for bar
    getTimeStub.returnValue = 325;
    limitedMemoF.invalidate();
    assert.deepStrictEqual(
      limitedMemoF.internal.memos, 
      { barKey: { r: 'computer says bar', at: 250 } },
    );
  });
});
