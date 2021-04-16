import * as assert from 'assert';
import * as sinon from 'sinon';
import {rateLimitCtor, rateLimitEmitLastCtor} from './rate_limit';
import {resolvedUndefined} from './resolved';

describe('rateLimitCtor', () => {
  it('produces a rate-limited function', async () => {
    // Setup
    const getTimeStub = () => getTimeStub.returns;
    getTimeStub.returns = 1000;

    const setTimeoutStub = (func) => {
      func();
      setTimeoutStub.callCount += 1;
      return 123; // a mock timeoutID
    }
    setTimeoutStub.callCount = 0;

    // rateLimiterCtor returns a rate limiter function.
    const rateLimit = rateLimitCtor(getTimeStub, setTimeoutStub);
    assert.strictEqual(typeof rateLimit, 'function');

    // The rate limiter gives us a rate-limited wrapper around the the function we pass it.
    const fStub = () => { fStub.callCount += 1 };
    fStub.callCount = 0
    let rateLimitedF = rateLimit(100, fStub);
    assert.strictEqual(typeof rateLimitedF, 'function');

    // If we call the rate-limited wrapper once, the original function is called right away
    rateLimitedF();
    assert.strictEqual(setTimeoutStub.callCount, 0);
    assert.strictEqual(fStub.callCount, 1);

    // If we make a second call before the rate is up, the call will be delayed
    getTimeStub.returns = 1010;
    rateLimitedF();
    assert.strictEqual(setTimeoutStub.callCount, 1);
    assert.strictEqual(fStub.callCount, 2);

    // If we call the rate-limited wrapper a third time before the rate is up, the call will be dropped
    // (oldest of the rate-limited calls wins... is that what we want?)
    getTimeStub.returns = 1020;
    rateLimitedF();
    assert.strictEqual(setTimeoutStub.callCount, 1);
    assert.strictEqual(fStub.callCount, 2);

    // We may have run into the limit of what's possible testing async code with a sync test
    // I'd like to assert that after the timeout is called, subsequent calls can again go through
    // however I beleive there's no way to do that without actually calling setTimeout and blocking on it
    // because the code relies on the async call to wipe out the timeoutHandle that was already set sync
  });
});

describe('rateLimitEmitLastCtor', () => {
  it('produces a rate-limited function that prefers the most recent call', async () => {
    // Steup
    const getTimeStub = () => getTimeStub.now;
    getTimeStub.now = 1000;

    const setTimeoutStub = (func) => {
      // fStub.callCountAsync += 1
      func();
      setTimeoutStub.callCount += 1;
      return 123; // a mock timeoutID
    }
    setTimeoutStub.callCount = 0;

    // rateLimitEmitLastCtor returns a rate limiter function
    const rateLimitEmitLast = rateLimitEmitLastCtor(getTimeStub, setTimeoutStub);
    assert.strictEqual(typeof rateLimitEmitLast, 'function');

    // The rate limiter gives us a rate-limited wrapper around the the function we pass it.
    const delayBetweenCallsMsMock = 100
    const fStub = (arg) => {
      fStub.calledWith.push(arg);
      fStub.callCount += 1;
      return resolvedUndefined;
    };
    fStub.calledWith = [null];
    fStub.callCount = 0;
    const callbackStub = sinon.stub();
    let rateLimitedF = rateLimitEmitLast(delayBetweenCallsMsMock, fStub, callbackStub)
    assert.strictEqual(typeof rateLimitedF, 'function');

    // If we call the rate-limited wrapper once, the original function is called right away
    await rateLimitedF('first call');
    assert.strictEqual(setTimeoutStub.callCount, 0);
    assert.strictEqual(fStub.callCount, 1);
    assert.strictEqual(fStub.calledWith[fStub.callCount], 'first call')

    // If we call the rate-limited wrapper again before the rate is up, the call is deferred
    getTimeStub.now = 1010;
    await rateLimitedF('second call');
    assert.strictEqual(setTimeoutStub.callCount, 1);
    assert.strictEqual(fStub.callCount, 2);
    assert.strictEqual(fStub.calledWith[fStub.callCount], 'second call')

    // If we call the rate-limited wrapper a third time before the rate is up...
    // the async call will ??
    getTimeStub.now = 1020;
    await rateLimitedF('third call');
    assert.strictEqual(setTimeoutStub.callCount, 2);
    assert.strictEqual(fStub.callCount, 3);
    assert.strictEqual(fStub.calledWith[fStub.callCount], 'third call');

    // Ideally we'd assert that fStub gets called with the most recent args
    // but ou
  });
});
