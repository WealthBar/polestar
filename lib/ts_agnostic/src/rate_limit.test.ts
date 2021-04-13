import * as assert from 'assert';
import * as sinon from 'sinon';
import {rateLimitCtor, rateLimitEmitLastCtor} from './rate_limit';
import {resolvedUndefined} from './resolved';

describe('rateLimitCtor', () => {
  it('produces a rate-limited function', async () => {
    // Setup
    const getTimeStub = () => getTimeStub.returns;
    getTimeStub.returns = 1000;

    const setTimeoutStub = () => {
      fStub.callCountAsync += 1
      setTimeoutStub.callCount += 1;
      return 123; // a mock timeoutID
    }
    setTimeoutStub.callCount = 0;

    // rateLimiterCtor returns a rate limiter function.
    const rateLimit = rateLimitCtor(getTimeStub, setTimeoutStub);
    assert.strictEqual(typeof rateLimit, 'function');

    // The rate limiter gives us a rate-limited wrapper around the the function we pass it.
    const fStub = () => { fStub.callCountSync += 1 };
    fStub.callCountSync = 0
    fStub.callCountAsync = 0
    let rateLimitedF = rateLimit(100, fStub);
    assert.strictEqual(typeof rateLimitedF, 'function');

    // If we call the rate-limited wrapper once, the original function is called right away
    rateLimitedF();
    assert.strictEqual(setTimeoutStub.callCount, 0);
    assert.strictEqual(fStub.callCountSync, 1);
    assert.strictEqual(fStub.callCountAsync, 0);

    // If we make a second call before the rate is up, the call will be delayed
    getTimeStub.returns = 1010;
    rateLimitedF();
    assert.strictEqual(setTimeoutStub.callCount, 1);
    assert.strictEqual(fStub.callCountSync, 1);
    assert.strictEqual(fStub.callCountAsync, 1);

    // If we call the rate-limited wrapper a third time before the rate is up, the call will be dropped
    // (oldest of the rate-limited calls wins... is that what we want?)
    getTimeStub.returns = 1020;
    rateLimitedF();
    assert.strictEqual(setTimeoutStub.callCount, 1);
    assert.strictEqual(fStub.callCountSync, 1);
    assert.strictEqual(fStub.callCountAsync, 1);

    // We may have run into the limit of what's possible testing async code with a sync test
    // I'd like to assert that after the timeout is called, subsequent calls can again go through
    // howerver I beleive there's no way to do that without actually calling setTimeout and blocking on it
    // because the code relies on the async call to wipe out the timeoutHandle that was already set sync
    // lines 17-19 are uncovered
  });
});

describe('rateLimitEmitLastCtor', () => {
  it('produces a rate-limited function that prefers the most recent call', async () => {
    // Steup
    const getTimeStub = () => getTimeStub.now;
    getTimeStub.now = 1000;

    const setTimeoutStub = () => {
      fStub.callCountAsync += 1
      setTimeoutStub.callCount += 1;
      return 123; // a mock timeoutID
    }
    setTimeoutStub.callCount = 0;

    // rateLimitEmitLastCtor returns a rate limiter function
    const rateLimitEmitLast = rateLimitEmitLastCtor(getTimeStub, setTimeoutStub);
    assert.strictEqual(typeof rateLimitEmitLast, 'function');

    // The rate limiter gives us a rate-limited wrapper around the the function we pass it.
    const delayBetweenCallsMsMock = 100
    const fStub = () => {
      fStub.callCountSync += 1
      return resolvedUndefined;
    };
    fStub.callCountSync = 0
    fStub.callCountAsync = 0
    const callbackStub = sinon.stub();
    let rateLimitedF = rateLimitEmitLast(delayBetweenCallsMsMock, fStub, callbackStub)
    assert.strictEqual(typeof rateLimitedF, 'function');

    // If we call the rate-limited wrapper once, the original function is called right away
    console.log('first call:');
    await rateLimitedF(1);
    assert.strictEqual(setTimeoutStub.callCount, 0);
    assert.strictEqual(fStub.callCountSync, 1);
    assert.strictEqual(fStub.callCountAsync, 0);

    // If we call the rate-limited wrapper again before the rate is up, the call is deferred
    console.log('second call:');
    getTimeStub.now = 1010;
    await rateLimitedF(2);
    assert.strictEqual(setTimeoutStub.callCount, 1);
    assert.strictEqual(fStub.callCountSync, 1);
    assert.strictEqual(fStub.callCountAsync, 1);

    // let's call the rate-limited wrapper a third time before the rate is up...
    console.log('third call:');
    getTimeStub.now = 1020;
    await rateLimitedF(3);
    assert.strictEqual(setTimeoutStub.callCount, 1);
    assert.strictEqual(fStub.callCountSync, 1);
    assert.strictEqual(fStub.callCountAsync, 1);

    // TODO: assert that fStub gets called with 3, not 2
  });
});
