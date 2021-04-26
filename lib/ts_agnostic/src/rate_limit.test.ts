import * as assert from 'assert';
import {rateLimitCtor, rateLimitEmitLastCtor} from './rate_limit';
import {resolvedUndefined} from './resolved';

describe('rateLimitCtor', () => {
  const setup = () => {
    const getTimeStub = () => getTimeStub.returnValue;
    getTimeStub.returnValue = 1000;

    const setTimeoutStub = (callback, delay) => {
      setTimeoutStub.callback = callback;
      setTimeoutStub.delay = delay;
      setTimeoutStub.callCount++;
      return setTimeoutStub.handle++;
    }
    setTimeoutStub.callback = () => undefined;
    setTimeoutStub.delay = null;
    setTimeoutStub.callCount = 0;
    setTimeoutStub.handle = 1;

    // rateLimiterCtor returns a rate limiter function.
    const rateLimit = rateLimitCtor(getTimeStub, setTimeoutStub);

    // The rate limiter gives us a rate-limited wrapper around the the function we pass it.
    const fStub = () => { fStub.callCount += 1 };
    fStub.callCount = 0
    let rateLimitedF = rateLimit(100, fStub);

    return {getTimeStub, setTimeoutStub, fStub, rateLimitedF};
  };

  it('Happy path', async () => {
    const {getTimeStub, setTimeoutStub, fStub, rateLimitedF} = setup();

    // If we call the rate-limited wrapper once, the original function is called right away
    rateLimitedF();
    assert.strictEqual(setTimeoutStub.callCount, 0);
    assert.strictEqual(fStub.callCount, 1);

    // If we make a second call before the rate is up, the call will be scheduled for later
    getTimeStub.returnValue = 1010;
    rateLimitedF();
    assert.strictEqual(setTimeoutStub.callCount, 1);
    assert.strictEqual(setTimeoutStub.delay, 90);
    assert.strictEqual(fStub.callCount, 1);

    // If we call the rate-limited wrapper a third time before the rate is up, the call will be dropped
    // (oldest of the rate-limited calls wins)
    getTimeStub.returnValue = 1020;
    rateLimitedF();
    assert.strictEqual(setTimeoutStub.callCount, 1);
    assert.strictEqual(fStub.callCount, 1);

    // 100 ms from the first deferred call, the timed-out callback runs
    getTimeStub.returnValue = 1110;
    setTimeoutStub.callback();
    assert.strictEqual(fStub.callCount, 2);

    // After a bit more time has elapsed we should again be able to get a call through,
    // this is essentially identical to the first call we made
    getTimeStub.returnValue = 2000;
    rateLimitedF();
    assert.strictEqual(fStub.callCount, 3);
    assert.strictEqual(setTimeoutStub.callCount, 1);
  });
});

describe('rateLimitEmitLastCtor', () => {
  const setup = () => {
    const getTimeStub = () => getTimeStub.returnValue;
    getTimeStub.returnValue = 1000;

    const setTimeoutStub = (callback, delay) => {
      setTimeoutStub.callback = callback;
      setTimeoutStub.delay = delay;
      setTimeoutStub.callCount++;
      return setTimeoutStub.handle++;
    }
    setTimeoutStub.callback = () => undefined;
    setTimeoutStub.delay = null;
    setTimeoutStub.callCount = 0;
    setTimeoutStub.handle = 1;

    // rateLimitEmitLastCtor returns a rate limiter function
    const rateLimitEmitLast = rateLimitEmitLastCtor(getTimeStub, setTimeoutStub);

    // The rate limiter gives us a rate-limited wrapper around the the function we pass it.
    const delayBetweenCallsMsMock = 100
    const fStub = (arg) => {
      fStub.lastCalledWith = arg;
      fStub.callCount += 1;
      return resolvedUndefined;
    };
    fStub.lastCalledWith = null;
    fStub.callCount = 0;
    const callbackStub:()=>void = () => {};
    let rateLimitedF = rateLimitEmitLast(delayBetweenCallsMsMock, fStub, callbackStub)

    return {getTimeStub, setTimeoutStub, fStub, rateLimitedF};
  };

  it('Happy path', async () => {
    const {getTimeStub, setTimeoutStub, fStub, rateLimitedF} = setup();

    // If we call the rate-limited wrapper once, the original function is called right away
    await rateLimitedF('first call');
    assert.strictEqual(setTimeoutStub.callCount, 0);
    assert.strictEqual(fStub.callCount, 1);
    assert.strictEqual(fStub.lastCalledWith, 'first call')

    // If we call the rate-limited wrapper again before the rate is up, the call is deferred
    getTimeStub.returnValue = 1010;
    await rateLimitedF('second call');
    assert.strictEqual(setTimeoutStub.callCount, 1);
    assert.strictEqual(setTimeoutStub.delay, 90);
    assert.strictEqual(fStub.callCount, 1);
    
    // If we call the rate-limited wrapper a third time before the rate is up, the deferred call should be set to use this argument instead
    getTimeStub.returnValue = 1020;
    await rateLimitedF('third call');
    assert.strictEqual(setTimeoutStub.callCount, 1);
    assert.strictEqual(fStub.callCount, 1);

    // 100ms from the first deferred call, the timed-out callback runs with the latest arguments
    getTimeStub.returnValue = 1110;
    await setTimeoutStub.callback();
    assert.strictEqual(fStub.callCount, 2);
    assert.strictEqual(fStub.lastCalledWith, 'third call');

    // After a bit more time has elapsed we should again be able to get a call through,
    // this is essentially identical to the first call we made
    getTimeStub.returnValue = 2000;
    await rateLimitedF('fourth call');
    assert.strictEqual(fStub.callCount, 3);
    assert.strictEqual(setTimeoutStub.callCount, 1);
  });

  it('Edge case - lastParams was updated while we waited on f to complete', async () => {
    const {getTimeStub, setTimeoutStub, fStub, rateLimitedF} = setup();
    
    await rateLimitedF('first call');

    getTimeStub.returnValue = 1010;
    await rateLimitedF('second call'); // will be deferred, just like the above test
    assert.strictEqual(setTimeoutStub.callCount, 1); // that's normal
    assert.strictEqual(setTimeoutStub.delay, 90);

    getTimeStub.returnValue = 2000; // well past the rate limit
    setTimeoutStub.callback(); // simulating a long-running callback to set up the problemastic race condition
    await rateLimitedF('third call'); // call while waiting for the previous call's callback

    // since we've past the rate limit, we would normally expect 'third call' to go straight through,
    // but in this case setTimeout has been called again because of the long-running callback
    assert.strictEqual(setTimeoutStub.callCount, 2);
  });
});
