import {isTuid} from "../../../../agnostic/src/tuid";
import * as assert from "assert";
import * as sinon from "sinon";
import {requestId} from "./request_id";

describe("request id middleware", () => {
  it("adds the request id to the ctx", async () => {
    const next = sinon.stub();
    const ctx: any = {};

    await requestId(ctx, next);

    assert(isTuid(ctx.requestId));
    sinon.assert.called(next);
  });
});
