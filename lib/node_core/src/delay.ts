import {cancellationTokenType} from "ts_agnostic";

export async function delay(milliseconds: number, cancellationToken?: cancellationTokenType): Promise<void> {
  return new Promise(r => {
    if (cancellationToken) {
      if (cancellationToken.isCancellationRequested) {
        r();
        return;
      }
      cancellationToken.onCancelRequested(r);
    }
    setTimeout(r, milliseconds);
  });
}
