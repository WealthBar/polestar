import * as assert from "assert";
import * as sinon from "sinon";
import {userCtor} from "./user";

function getSut() {
  const dbUser = {
    vivify: sinon.stub(),
    byId: sinon.stub(),
  };
  const dbPermission = sinon.stub();
  const sut = userCtor(dbUser, dbPermission);
  return {sut, dbUser, dbPermission};
}

describe("user", async () => {
  it("creates user in the db if the user has logged in", async () => {
    const {sut, dbUser} = getSut();
    dbUser.vivify.resolves("00055d6d-2322-43f2-affc-0145b25c5f09");
    dbUser.byId.resolves({email: "test@example.com", displayName: ""});
    const ctx: any = {
      sessionInfo: {},
      state: {user: {email: "test@example.com"}}, // created by passport
    };

    const next = sinon.stub();
    await sut(ctx, next);

    dbUser.vivify.calledWith({email: "test@example.com", displayName: ""});
    assert.strictEqual(ctx.state, undefined);
    assert.strictEqual(ctx.sessionInfo.email, "test@example.com");
    assert.strictEqual(ctx.sessionInfo.displayName, "");
  });

  it("adds user information to the session if userId is present", async () => {
    const {sut, dbUser, dbPermission} = getSut();
    dbUser.byId.resolves({email: "test@example.com", displayName: ""});
    dbPermission.resolves({A: 1});

    const ctx: any = {
      sessionInfo: {userId: "00055d6d-2322-43f2-affc-0145b25c5f09"},
    };

    const next = sinon.stub();
    await sut(ctx, next);
    dbUser.byId.calledWith("00055d6d-2322-43f2-affc-0145b25c5f09");
    assert(!dbUser.vivify.called);
    assert.strictEqual(ctx.sessionInfo.permission.A, 1);
  });

  it("does nothing is not user information or userId is present", async () => {
    const {sut, dbUser} = getSut();
    const ctx: any = {
      sessionInfo: {},
    };

    const next = sinon.stub();
    await sut(ctx, next);
    assert(!dbUser.byId.called);
    assert(!dbUser.vivify.called);
  });
});
