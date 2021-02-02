import * as assert from "assert";
import * as sinon from "sinon";
import {dbProviderStub} from "./db_provider_stub";
import {dbSessionCtor} from "./db_session";
import {value as createSql} from "./db_session_create_sql";
import {value as deleteSql} from "./db_session_delete_sql";
import {value as expireSql} from "./db_session_expire_sql";
import {value as updateSql} from "./db_session_update_sql";
import {value as verifySql} from "./db_session_verify_sql";

describe("dbSession", async () => {
  it("create a new session", async () => {
    const {dbProvider, db} = dbProviderStub(sinon);
    db.one.resolves({
      session_id: "00055d6c5f9ef0da1ddf53e9148f622bffa112496a98abaa197106fdec4befb6",
      data: "{}",
    });
    const subject = dbSessionCtor(dbProvider);

    const result = await subject.create("-");

    assert(db.one.calledWith(createSql));
    assert(result);

    assert.strictEqual(result.sessionId, "00055d6c5f9ef0da1ddf53e9148f622bffa112496a98abaa197106fdec4befb6");
    assert.strictEqual(result.data, "{}");
  });

  it("create fails", async () => {
    const {dbProvider, db} = dbProviderStub(sinon);
    db.one.resolves(undefined);
    const subject = dbSessionCtor(dbProvider);

    try {
      await subject.create("-");
      assert.fail("should not get here");
    } catch (e) {
      assert(e instanceof Error);
    }
    assert(db.one.calledWith(createSql));
  });

  it("verify a valid session", async () => {
    const {dbProvider, db} = dbProviderStub(sinon);
    db.oneOrNone.resolves({
      session_id: "00055d6c5f9ef0da1ddf53e9148f622bffa112496a98abaa197106fdec4befb6",
      data: "{}",
      user_id: undefined,
    });
    const subject = dbSessionCtor(dbProvider);

    const result = await subject.verify("00055d6c5f9ef0da1ddf53e9148f622bffa112496a98abaa197106fdec4befb6", "-");

    assert(db.oneOrNone.calledWith(verifySql, {sessionId: "00055d6c5f9ef0da1ddf53e9148f622bffa112496a98abaa197106fdec4befb6"}));

    assert(result);
    if (result) {
      // if test is required because of strictNullChecks being on in tsconfig
      assert.strictEqual(result.sessionId, "00055d6c5f9ef0da1ddf53e9148f622bffa112496a98abaa197106fdec4befb6");
      assert.strictEqual(result.data, "{}");
    }
  });

  it("verify an invalid session", async () => {
    const {dbProvider, db} = dbProviderStub(sinon);
    db.oneOrNone.resolves(undefined);
    const subject = dbSessionCtor(dbProvider);

    const result = await subject.verify("00055d6c5f9ef0da1ddf53e9148f622bffa112496a98abaa197106fdec4befb6","-");

    assert(db.oneOrNone.calledWith(verifySql, {sessionId: "00055d6c5f9ef0da1ddf53e9148f622bffa112496a98abaa197106fdec4befb6"}));
    assert.strictEqual(result, undefined);
  });

  it("update a session", async () => {
    const {dbProvider, db} = dbProviderStub(sinon);
    db.result.resolves(true);
    const subject = dbSessionCtor(dbProvider);

    await subject.update({
      sessionId: "00055d6c5f9ef0da1ddf53e9148f622bffa112496a98abaa197106fdec4befb6",
      userId: "00055d6d-2322-43f2-affc-0145b25c5f09",
      data: {},
    }, 10000, "-");

    assert(db.result.calledWith(updateSql, {
      sessionId: "00055d6c5f9ef0da1ddf53e9148f622bffa112496a98abaa197106fdec4befb6",
      userId: "00055d6d-2322-43f2-affc-0145b25c5f09",
      expiryInterval: 10000,
      data: {},
    }));
  });

  it("delete a session", async () => {
    const {dbProvider, db} = dbProviderStub(sinon);
    db.result.resolves(true);
    const subject = dbSessionCtor(dbProvider);
    await subject.delete("00055d6c5f9ef0da1ddf53e9148f622bffa112496a98abaa197106fdec4befb6", "-");
    assert(db.result.calledWith(deleteSql, {
      sessionId: "00055d6c5f9ef0da1ddf53e9148f622bffa112496a98abaa197106fdec4befb6",
    }));
  });

  it("expire old sessions", async () => {
    const {dbProvider, db} = dbProviderStub(sinon);
    db.result.resolves({rowCount: 1});
    const subject = dbSessionCtor(dbProvider);

    await subject.expire("-");

    assert(db.result.calledWith(expireSql));
  });
});
