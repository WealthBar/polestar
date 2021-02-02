import * as assert from "assert";
import * as sinon from "sinon";
import { dbProviderStub } from "./db_provider_stub";
import { dbUserCtor } from "./db_user";
import { value as byIdSql } from "./db_user_by_id_sql";
import { value as vivifySql } from "./db_user_vivify_sql";

describe("dbUser", async () => {
  it("vivify a user", async () => {
    const { dbProvider, db } = dbProviderStub(sinon);
    db.one.resolves({ user_id: "00055d6d-2322-43f2-affc-0145b25c5f09" });

    const subject = dbUserCtor(dbProvider);

    const result = await subject.vivify({ email: "asdf@example.com", displayName: "bob" }, "-");

    assert(db.one.calledWith(vivifySql, { email: "asdf@example.com", displayName: "bob" }));
    assert.strictEqual(result, "00055d6d-2322-43f2-affc-0145b25c5f09");
  });

  it("vivify a user fails", async () => {
    const { dbProvider, db } = dbProviderStub(sinon);
    db.one.resolves(undefined);

    const subject = dbUserCtor(dbProvider);

    const result = await subject.vivify({ email: "asdf@example.com", displayName: "bob" }, "-");

    assert.strictEqual(result, undefined);
  });

  it("byId user lookup", async () => {
    const { dbProvider, db } = dbProviderStub(sinon);
    db.one.resolves({
      user_id: "00055d6d-2322-43f2-affc-0145b25c5f09",
      email: "asdf@example.com",
      display_name: "bob",
    });

    const subject = dbUserCtor(dbProvider);

    const result = await subject.byId("00055d6d-2322-43f2-affc-0145b25c5f09", "-");

    assert(db.one.calledWith(byIdSql, { userId: "00055d6d-2322-43f2-affc-0145b25c5f09" }));
    assert(result);
    if (result) {
      assert.strictEqual(result.userId, "00055d6d-2322-43f2-affc-0145b25c5f09");
      assert.strictEqual(result.email, "asdf@example.com");
      assert.strictEqual(result.displayName, "bob");
    }
  });

  it("byId user lookup fails", async () => {
    const { dbProvider, db } = dbProviderStub(sinon);
    db.one.resolves(undefined);

    const subject = dbUserCtor(dbProvider);

    const result = await subject.byId("00055d6d-2322-43f2-affc-0145b25c5f09", "-");

    assert.strictEqual(result, undefined);
  });
});
