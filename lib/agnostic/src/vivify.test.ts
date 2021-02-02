import * as assert from "assert";
import {vivify} from "./vivify";

describe(
  "vivify",
  () => {
    it(
      "sets property to default value when it is not already set and returns it.",
      () => {
        const obj = Object.create(null);
        const defaultValue = Object.create(null);
        assert(vivify(obj, "foo", defaultValue) === defaultValue);
        assert(obj.foo === defaultValue);
      },
    );
    it(
      "does not set property to default value when it is already set and returns existing value.",
      () => {
        const obj = Object.create(null);
        const existingValue = Object.create(null);
        obj.foo = existingValue;
        const defaultValue = Object.create(null);
        assert(vivify(obj, "foo", defaultValue) === existingValue);
        assert(obj.foo === existingValue);
      },
    );
    it("example", () => {
      const entries = [
        {currency: "CAD", value: 1},
        {currency: "USD", value: 2},
        {currency: "USD", value: 1},
        {currency: "CAD", value: 4},
      ];

      const byCurrency = Object.create(null);
      for (const entry of entries) {
        vivify(byCurrency, entry.currency, [] as typeof entries).push(entry);
      }
      assert.deepEqual(byCurrency, {CAD: [entries[0], entries[3]], USD: [entries[1], entries[2]]});
    });
  },
);
