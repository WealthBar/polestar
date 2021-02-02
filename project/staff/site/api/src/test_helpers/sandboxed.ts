/* eslint-disable import/no-extraneous-dependencies */

import * as sinon from "sinon";

export const sandboxed = async function sandboxed(this: any, wrappedFunction: (sandbox) => Promise<void>) {
  const sandbox = sinon.createSandbox({
    injectInto: this,
    properties: ["stub", "spy", "mock", "clock", "request"],
    useFakeServer: true,
    useFakeTimers: true,
  });

  try {
    await wrappedFunction(sandbox);
  } finally {
    sandbox.restore();
  }
};
