import * as assert from 'assert';
import {starRepositoryCtorCtor, stateModifierFunctionType} from './star_repo';
import {registryCtor} from './registry';
import {serializableType} from './serialize';
import {Draft} from 'immer';
import {tuidCtorForTesting} from './tuid';

describe('starRepo', () => {
  it('basics', async () => {
    const eventRegistry = registryCtor<stateModifierFunctionType>();

    function append(eventParams: serializableType, state: Draft<serializableType>): void {
      Object.assign(state, eventParams);
    }

    function remove(eventParams: serializableType, state: Draft<serializableType>): void {
      if (typeof eventParams?.['what'] === 'string' && state) {
        delete state[eventParams['what']];
      }
    }

    function exception(eventParams: serializableType, state: Draft<serializableType>): void {
      throw new Error('oops');
    }

    eventRegistry.register('append', append);
    eventRegistry.register('remove', remove);

    // normally you'd lock the registry.

    const messages: string[] = [];

    async function onLocal(message: string): Promise<void> {
      messages.push(message);
    }

    const errors: { error: string, details: Record<string, unknown> }[] = [];

    function onError(error: string, details: Record<string, unknown>): void {
      errors.push({error, details});
    }

    const src = starRepositoryCtorCtor(tuidCtorForTesting());
    const sr = src(
      eventRegistry,
      onLocal,
      onError,
    );

    assert.strictEqual(sr.clientId, '00000000-4000-8000-0000-000000000000');

    await sr.apply('append', {a: 1});
    await sr.apply('append', {b: 2});
    await sr.apply('append', {c: 3});
    await sr.apply('delete', {what: 'c'});
    await sr.apply('remove', {what: 'c'});

    assert.deepStrictEqual(messages, [
      '{"clientId":"00000000-4000-8000-0000-000000000000","event":{"name":"append","params":{"a":1}},"eventId":"00000000-4000-8000-0000-000000000001","eventRegistrySignature":"5ed83c298a4eaafc","postEventSignature":"ca0b885a32fc8b48"}',
      '{"clientId":"00000000-4000-8000-0000-000000000000","event":{"name":"append","params":{"b":2}},"eventId":"00000000-4000-8000-0000-000000000002","eventRegistrySignature":"5ed83c298a4eaafc","postEventSignature":"125600492fb0dec7"}',
      '{"clientId":"00000000-4000-8000-0000-000000000000","event":{"name":"append","params":{"c":3}},"eventId":"00000000-4000-8000-0000-000000000003","eventRegistrySignature":"5ed83c298a4eaafc","postEventSignature":"424b61ff59dba18f"}',
      '{"clientId":"00000000-4000-8000-0000-000000000000","event":{"name":"remove","params":{"what":"c"}},"eventId":"00000000-4000-8000-0000-000000000004","eventRegistrySignature":"5ed83c298a4eaafc","postEventSignature":"125600492fb0dec7"}',
    ]);
    assert.deepStrictEqual(errors, [
      {
        error: 'NOT_IN_EVENT_REGISTRY',
        details: {name: 'delete', local: true},
      },
    ]);
    assert.deepStrictEqual(sr.state, {a: 1, b: 2});
    assert.strictEqual(sr.stateSignature, '125600492fb0dec7');
    assert.strictEqual(sr.pendingCount, 4);

    await sr.onRemote('{"clientId":"00000000-4000-8000-0000-000000000000","event":{"name":"append","params":{"a":1}},"eventId":"00000000-4000-8000-0000-000000000001","eventRegistrySignature":"5ed83c298a4eaafc","postEventSignature":"ca0b885a32fc8b48"}');

    assert.strictEqual(sr.pendingCount, 3);
    assert.strictEqual(sr.stateSignature, '125600492fb0dec7');

    await sr.onRemote('{"clientId":"00000000-4000-8000-0000-000000000000","event":{"name":"append","params":{"b":2}},"eventId":"00000000-4000-8000-0000-000000000002","eventRegistrySignature":"5ed83c298a4eaafc","postEventSignature":"125600492fb0dec7"}');

    assert.strictEqual(sr.pendingCount, 2);
    assert.strictEqual(sr.stateSignature, '125600492fb0dec7');

    await sr.onRemote('{"clientId":"00000000-4000-8000-0000-000000100000","event":{"name":"append","params":{"d":4}},"eventId":"00000000-4000-8000-0000-000000010000","eventRegistrySignature":"5ed83c298a4eaafc","postEventSignature":"399479ffa4646446"}');

    assert.strictEqual(sr.pendingCount, 2);
    assert.strictEqual(sr.stateSignature, '399479ffa4646446');

    await sr.onRemote('{"clientId":"00000000-4000-8000-0000-000000100000","event":{"name":"append","params":{"e":5}},"eventId":"00000000-4000-8000-0000-000000010001","eventRegistrySignature":"5ed83c298a4eaafc","postEventSignature":""}');

    assert.deepStrictEqual(errors[1], {
      error: 'ON_REMOTE_STATE_SIGNATURE_MISMATCH',
      details: {signature: 'f441174317511daa', postEventSignature: ''},
    });

    // mismatch ignored and not applied.
    assert.deepStrictEqual(sr.state, {a: 1, b: 2, d: 4});
    assert.strictEqual(sr.pendingCount, 2);
    assert.strictEqual(sr.stateSignature, '399479ffa4646446');

    await sr.onRemote('{"clientId":"00000000-4000-8000-0000-000000000000","event":{"name":"append","params":{"c":3}},"eventId":"00000000-4000-8000-0000-000000000003","eventRegistrySignature":"5ed83c298a4eaafc","postEventSignature":"323c93acb75e8997"}');

    assert.deepStrictEqual(sr.headState, {a: 1, b: 2, c: 3, d: 4});
    assert.deepStrictEqual(sr.state, {a: 1, b: 2, d: 4});
    assert.strictEqual(sr.pendingCount, 1);
    await sr.onRemote('{"clientId":"00000000-4000-8000-0000-000000000000","event":{"name":"remove","params":{"what":"c"}},"eventId":"00000000-4000-8000-0000-000000000004","eventRegistrySignature":"5ed83c298a4eaafc","postEventSignature":"399479ffa4646446"}');

    assert.deepStrictEqual(sr.headState, {a: 1, b: 2, d: 4});
    assert.deepStrictEqual(sr.state, {a: 1, b: 2, d: 4});
    assert.strictEqual(sr.pendingCount, 0);

    await sr.onRemote('{"clientId":"00000000-4000-8000-0000-000000000000","event":{"name":"remove","params":{"what":"c"}},"eventId":"00000000-4000-8000-0000-000000000004","eventRegistrySignature":"5ed83c298a4eaafx","postEventSignature":"399479ffa4646446"}');
    assert.deepStrictEqual(errors[2], {
      error: 'ON_REMOTE_EVENT_REGISTRY_SIGNATURE_MISMATCH',
      details: {remoteSignature: '5ed83c298a4eaafx', localSignature: '5ed83c298a4eaafc'},
    });

    eventRegistry.register('exception', exception);

    await sr.onRemote('{"clientId":"00000000-4000-8000-0000-000000000000","event":{"name":"exception","params":{}},"eventId":"00000000-4000-8000-0000-000000000008","eventRegistrySignature":"438b04a2f67f6943","postEventSignature":"399479ffa4646446"}');
    assert.strictEqual(errors[3].error, 'ON_REMOTE_EXCEPTION');
    assert.strictEqual((errors[3].details as any)?.exception.toString(), 'Error: oops');
  });
});
