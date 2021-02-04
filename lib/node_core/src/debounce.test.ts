import {debounceCtor, debounceAsyncCtor} from "./debounce";
import * as sinon from "sinon";
import * as assert from "assert";

describe("debounce", () => {
  function getSut() {
    const clock = sinon.stub();
    const subject = debounceCtor(clock);
    return {subject, clock};
  }

  it("debounces", () => {
    const {subject, clock} = getSut();
    clock.returns(0);

    const f = sinon.stub();
    const g = subject(20, f);
    g(1);
    g(2);
    clock.returns(19);
    g(3);
    clock.returns(20);
    g(4);
    g(5);
    clock.returns(30);
    g(6);
    clock.returns(39);
    g(7);
    clock.returns(40);
    g(8);
    clock.returns(41);
    g(9);
    assert.deepStrictEqual(f.args.flat(), [1, 4, 8]);
  });
});

describe("debounceAsync", () => {
  function getSut() {
    const clock = sinon.stub();
    const subject = debounceAsyncCtor(clock);
    return {subject, clock};
  }

  it("debounces", async () => {
    const {subject, clock} = getSut();
    clock.returns(0);

    const f = sinon.stub();
    const g = subject(20, f);
    await g(1);
    await g(2);
    clock.returns(19);
    await g(3);
    clock.returns(20);
    await g(4);
    await g(5);
    clock.returns(30);
    await g(6);
    clock.returns(39);
    await g(7);
    clock.returns(40);
    await g(8);
    clock.returns(41);
    await g(9);
    assert.deepStrictEqual(f.args.flat(), [1, 4, 8]);
  });
});
