import * as assert from "assert";
import { verifyCtor } from "./verify";

describe("auth/verify", async () => {
  let result: any = {};

  const cb = (error, user) => {
    result.error = error;
    result.user = user;
  };

  it("Login with email address", async () => {

    const profile = {
      emails: [{ value: "person@example.com" }],
      displayName: "Test User",
    };

    const subject = verifyCtor();

    subject(undefined, undefined, profile, cb);

    assert.strictEqual(result.error, null, "No error is thrown");
    assert.strictEqual(result.user.email, profile.emails[0].value, "Email is assigned to user");
    assert.strictEqual(result.user.name, profile.displayName, "Name is assigned to user");
  });

  it("Login with invalid email address", async () => {
    result = {};
    const profile = {
      emails: [{ value: "person_example.com" }],
      displayName: "Test User",
    };

    verifyCtor()(undefined, undefined, profile, cb);

    assert(result.error, "An error is returned");
    assert(!result.user, "User is not assigned");
  });
});
