import * as sinon from 'sinon';
import * as assert from 'assert';
import {limitedMemoFCtor} from './limited_memo';

describe('limitedMemoFCtor', () => {
  it('memoizes results', async () => {
    const fStub = sinon.stub();
    fStub.withArgs('foo').returns('computer says foo');
    fStub.withArgs('bar').returns('computer says bar');
    const toKeyStub = sinon.stub();
    toKeyStub.returnsArg(0);
    const memoizedFunc = limitedMemoFCtor(5, fStub, toKeyStub);

    let result = await memoizedFunc('foo');
    assert.strictEqual(result, 'computer says foo');
    sinon.assert.callCount(fStub, 1);
    
    result = await memoizedFunc('foo');
    assert.strictEqual(result, 'computer says foo');
    sinon.assert.callCount(fStub, 1);

    result = await memoizedFunc('bar');
    assert.strictEqual(result, 'computer says bar');
    sinon.assert.callCount(fStub, 2);

    result = await memoizedFunc('bar');
    assert.strictEqual(result, 'computer says bar');
    sinon.assert.callCount(fStub, 2);

    // If we clear the cache, we should see fStub get called again
    memoizedFunc.clear();

    result = await memoizedFunc('foo');
    assert.strictEqual(result, 'computer says foo');
    sinon.assert.callCount(fStub, 3);
    
    result = await memoizedFunc('foo');
    assert.strictEqual(result, 'computer says foo');
    sinon.assert.callCount(fStub, 3);

    result = await memoizedFunc('bar');
    assert.strictEqual(result, 'computer says bar');
    sinon.assert.callCount(fStub, 4);

    result = await memoizedFunc('bar');
    assert.strictEqual(result, 'computer says bar');
    sinon.assert.callCount(fStub, 4);

    // We're not past the maxTime yet, so invalidating should do nothing
    memoizedFunc.invalidate();

    result = await memoizedFunc('foo');
    assert.strictEqual(result, 'computer says foo');
    sinon.assert.callCount(fStub, 4);

    result = await memoizedFunc('bar');
    assert.strictEqual(result, 'computer says bar');
    sinon.assert.callCount(fStub, 4);

    // If we wait until after the maxTime has elapsed and THEN invalidate,
    // we should see the same result as when we called clear().
    // (because both memoized results are the same age)
    await new Promise(r => setTimeout(r, 10));
    memoizedFunc.invalidate();
  
    result = await memoizedFunc('foo');
    assert.strictEqual(result, 'computer says foo');
    sinon.assert.callCount(fStub, 5);
    
    result = await memoizedFunc('foo');
    assert.strictEqual(result, 'computer says foo');
    sinon.assert.callCount(fStub, 5);

    result = await memoizedFunc('bar');
    assert.strictEqual(result, 'computer says bar');
    sinon.assert.callCount(fStub, 6);

    result = await memoizedFunc('bar');
    assert.strictEqual(result, 'computer says bar');
    sinon.assert.callCount(fStub, 6);
  });
});
