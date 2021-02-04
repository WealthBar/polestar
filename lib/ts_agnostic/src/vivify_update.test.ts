import * as assert from "assert";
import {vivifyUpdate} from "./vivify_update";

describe(
  "vivifyUpdate",
  () => {
    it(
      "sets property to default value when it is not already set, calls the update function on it, and returns the updated value.",
      () => {
        const obj = Object.create(null);
        const defaultValue = 0;
        assert(vivifyUpdate(
          obj,
          "foo",
          (x) => x + 1,
          defaultValue,
        ) === 1);
        assert(obj.foo === 1);
      },
    );
    it(
      "does not set property to default value when it is already set and returns the updated value.",
      () => {
        const obj = Object.create(null);
        obj.foo = 1;
        const defaultValue = 0;
        assert(vivifyUpdate(
          obj,
          "foo",
          (x) => x + 1,
          defaultValue,
        ) === 2);
        assert(obj.foo === 2);
      },
    );
    it("example", () => {
      const entries = [
        {currency: "CAD", value: 1},
        {currency: "USD", value: 2},
        {currency: "USD", value: 1},
        {currency: "CAD", value: 4},
      ];
      const totalsByCurrency = Object.create(null);
      for (const entry of entries) {
        vivifyUpdate(totalsByCurrency, entry.currency, (value) => value + entry.value, 0);
      }

      assert.deepEqual(totalsByCurrency, {CAD: 5, USD: 3});
    });
  },
);
