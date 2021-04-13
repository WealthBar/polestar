import * as assert from 'assert';
import {pubSubCtorCtor, pubSubPlayCtorCtor} from './pubsub';
import {registryCtor} from './registry';
import {tuidCtorForTesting} from './tuid';

const tuidCtor = tuidCtorForTesting(0);
const pubSubCtor = pubSubCtorCtor(tuidCtor, registryCtor);
const pubSubPlayCtor = pubSubPlayCtorCtor(tuidCtor, registryCtor);

describe('pubSubPlay', () => {
  it('basics', async () => {
    const psp = pubSubPlayCtor();
    const m1: string[] = [];
    const m2: string[] = [];
    psp.sub(async message => { m1.push(message) });
    const us2 = psp.sub(async message => { m2.push(message) });

    await psp.pub("1");
    await psp.pub("2");

    assert.deepStrictEqual(m1, []);
    assert.deepStrictEqual(m2, []);

    await psp.play(2);
    await psp.pub("3");

    assert.deepStrictEqual(m1, ["1","2"]);
    assert.deepStrictEqual(m2, ["1","2"]);

    await psp.play(0);

    assert.deepStrictEqual(m1, ["1","2"]);
    assert.deepStrictEqual(m2, ["1","2"]);

    us2();

    await psp.play(4);

    assert.deepStrictEqual(m1, ["1","2","3"]);
    assert.deepStrictEqual(m2, ["1","2"]);

  });
});


describe('pubSub', () => {
  it('basics', async () => {
    const psp = pubSubCtor();
    const m1: string[] = [];
    const m2: string[] = [];
    psp.sub(async message => { m1.push(message) });
    const us2 = psp.sub(async message => { m2.push(message) });

    await psp.pub("1");
    await psp.pub("2");
    us2();
    await psp.pub("3");

    assert.deepStrictEqual(m1, ["1","2","3"]);
    assert.deepStrictEqual(m2, ["1","2"]);
  });
});
