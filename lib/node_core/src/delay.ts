import {cancellationTokenType} from "../../ts_agnostic/src/cancellation_token";

export async function delay(milliseconds: number, cancellationToken?: cancellationTokenType): Promise<void> {
  return new Promise(r => {
    if (cancellationToken) {
      if (cancellationToken.isCancellationRequested) {
        return;
      }
      cancellationToken.onCancelRequested(r);
    }
    setTimeout(r, milliseconds);
  });
}
