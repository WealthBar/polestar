import {delay} from './delay';
import * as assert from 'assert';
import {cancellationCallbackType, resolvedTrue} from 'ts_agnostic';
import {cancellationTokenType} from "ts_agnostic";

describe('delay', () => {
  it('Delays by the correct amount', async () => {
    const start = Date.now();
    await delay(100);
    const end = Date.now();
    const diff = end - start;

    assert(diff < 110);
    assert(diff >= 100);
  });

  it('Cancellation token is passed, cancellation is not requested', async () => {
    const onCancelRequestedStub = (r) => {
      onCancelRequestedStub.callCount++;
      return () => {}
    };
    onCancelRequestedStub.callCount = 0;

    const cancellationToken: cancellationTokenType = {
      onCancelRequested: onCancelRequestedStub,
      requestCancellation: () => {},
      isCancellationRequested: false,
      waitForCancellation: () => resolvedTrue,
    }

    const start = Date.now();
    await delay(100, cancellationToken)
    const end = Date.now();
    const diff = end - start;

    assert.strictEqual(onCancelRequestedStub.callCount, 1);
    assert(diff < 110);
    assert(diff >= 100);
  });

  it('Cancellation token is passed, cancellation is requested', async () => {
    const onCancelRequestedStub = (r) => {
      onCancelRequestedStub.callCount++;
      return () => {}
    };
    onCancelRequestedStub.callCount = 0;

    const cancellationToken: cancellationTokenType = {
      onCancelRequested: onCancelRequestedStub,
      requestCancellation: () => {},
      isCancellationRequested: true,
      waitForCancellation: () => resolvedTrue,
    }

    delay(100, cancellationToken);
    assert.strictEqual(onCancelRequestedStub.callCount, 0);
  });
});
