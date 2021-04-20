import * as assert from 'assert';
import * as sinon from 'sinon';
import {rateLimitCtor, rateLimitEmitLastCtor} from './rate_limit';
import {resolvedUndefined} from './resolved';

describe('rateLimitCtor', () => {
  // Setup
  let time = 1000;
  const getTimeStub = () => time;

  const setTimeoutStub = (callback) => {
    setTimeoutStub.callback = callback;
    setTimeoutStub.callCount++;
    return setTimeoutStub.handle++;
  }
  setTimeoutStub.handle = 1;
  setTimeoutStub.callback = () => undefined;
  setTimeoutStub.callCount = 0;

  // rateLimiterCtor returns a rate limiter function.
  const rateLimit = rateLimitCtor(getTimeStub, setTimeoutStub);

  // The rate limiter gives us a rate-limited wrapper around the the function we pass it.
  const fStub = () => { fStub.callCount += 1 };
  fStub.callCount = 0
  let rateLimitedF = rateLimit(100, fStub);

  it('happy path', async () => {
    // If we call the rate-limited wrapper once, the original function is called right away
    rateLimitedF();
    assert.strictEqual(setTimeoutStub.callCount, 0);
    assert.strictEqual(fStub.callCount, 1);

    // If we make a second call before the rate is up, the call will be scheduled for later
    time = 1010;
    rateLimitedF();
    assert.strictEqual(setTimeoutStub.callCount, 1);
    assert.strictEqual(fStub.callCount, 1);

    // If we call the rate-limited wrapper a third time before the rate is up, the call will be dropped
    // (oldest of the rate-limited calls wins... is that what we want?)
    time = 1020;
    rateLimitedF();
    assert.strictEqual(setTimeoutStub.callCount, 1);
    assert.strictEqual(fStub.callCount, 1);

    // 100 ms from the first deferred call, the timed-out callback runs
    time = 1110;
    setTimeoutStub.callback();
    assert.strictEqual(fStub.callCount, 2);

    // After a bit more time has elapsed we should again be able to get a call through,
    // this is essentially identical to the first call we made
    time = 2000;
    rateLimitedF();
    assert.strictEqual(fStub.callCount, 3);
    assert.strictEqual(setTimeoutStub.callCount, 1);
  });
});

describe('rateLimitEmitLastCtor', () => {
  // so setup, much boilerplate
  let time = 1000;
  const getTimeStub = () => time;

  const setTimeoutStub = (callback) => {
    setTimeoutStub.callback = callback;
    setTimeoutStub.callCount++;
    return setTimeoutStub.handle++;
  }
  setTimeoutStub.callCount = 0;
  setTimeoutStub.handle = 1;
  setTimeoutStub.callback = () => undefined;

  // rateLimitEmitLastCtor returns a rate limiter function
  const rateLimitEmitLast = rateLimitEmitLastCtor(getTimeStub, setTimeoutStub);

  // The rate limiter gives us a rate-limited wrapper around the the function we pass it.
  const delayBetweenCallsMsMock = 100
  const fStub = (arg) => {
    fStub.calledWith.push(arg);
    fStub.callCount += 1;
    return resolvedUndefined;
  };
  fStub.calledWith = [null];
  fStub.callCount = 0;
  const callbackStub:()=>void = () => {};
  let rateLimitedF = rateLimitEmitLast(delayBetweenCallsMsMock, fStub, callbackStub)

  it('happy path', async () => {
    // If we call the rate-limited wrapper once, the original function is called right away
    await rateLimitedF('first call');
    assert.strictEqual(setTimeoutStub.callCount, 0);
    assert.strictEqual(fStub.callCount, 1);
    assert.strictEqual(fStub.calledWith[fStub.callCount], 'first call')

    // If we call the rate-limited wrapper again before the rate is up, the call is deferred
    time = 1010;
    await rateLimitedF('second call');
    assert.strictEqual(setTimeoutStub.callCount, 1);
    assert.strictEqual(fStub.callCount, 1);
    
    // If we call the rate-limited wrapper a third time before the rate is up, the deferred call should be set to use this argument instead
    time = 1020;
    await rateLimitedF('third call');
    assert.strictEqual(setTimeoutStub.callCount, 1);
    assert.strictEqual(fStub.callCount, 1);

    // 100ms from the first deferred call, the timed-out callback runs with the latest arguments
    time = 1110;
    await setTimeoutStub.callback();
    assert.strictEqual(fStub.callCount, 2);
    assert.strictEqual(fStub.calledWith[fStub.callCount], 'third call');

    // After a bit more time has elapsed we should again be able to get a call through,
    // this is essentially identical to the first call we made
    time = 2000;
    await rateLimitedF('fourth call');
    assert.strictEqual(fStub.callCount, 3);
    assert.strictEqual(setTimeoutStub.callCount, 1);
  });

  it('edge case, lastParams was updated while we waited on f to complete', async () => {
    assert.strictEqual(setTimeoutStub.handle, 2);

    setTimeoutStub.callback(); // calling without await to set up the problematic race condition
    await rateLimitedF('another call while waiting for the previous call');

    assert.strictEqual(setTimeoutStub.handle, 4); // both calls incremented the handle!
  });
});
