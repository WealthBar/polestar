import * as assert from 'assert';
import {packetCallRequestType, remoteRequestManagerCtorCtor} from './remote_request_manager';
import {tuidCtorForTesting} from './tuid';
import {DateTime} from 'luxon';
import {cancellationTokenCtorCtor} from './cancellation_token';
import {serializableType} from './serialize';

const tuidCtor = tuidCtorForTesting(0);
const cancellationTokenCtor = cancellationTokenCtorCtor(tuidCtor);

describe('remoteRequestManager', () => {
  it('basics', async () => {
    let time: DateTime = DateTime.fromISO('2020-01-01T00:00:00Z');
    const rmc = remoteRequestManagerCtorCtor(tuidCtorForTesting(), () => time);
    const cancellationToken = cancellationTokenCtor();

    let pingCalls = 0;

    function onPing(): void {
      ++pingCalls;
    }

    const calls: packetCallRequestType[] = [];

    async function handleCallRequest(call: packetCallRequestType): Promise<serializableType | undefined> {
      calls.push(call);
      if (call.call.name === 'x') {
        throw new Error('x');
      }
      return {bob: 2};
    }

    const toRemotes: string[] = [];

    function toRemote(data: string): void {
      toRemotes.push(data);
    }

    const errors: { error: string, details: Record<string, unknown> }[] = [];

    function onError(error: string, details: Record<string, unknown>): void {
      errors.push({error, details});
    }

    const rm = rmc(toRemote, handleCallRequest, onPing, onError);
    rm.init();
    rm.ping();
    const r1p = rm.call('foo', {alice: 1});
    await rm.fromRemote('{"ctl":"init"}');
    await rm.fromRemote('{"ctl":"active"}');
    time = DateTime.fromISO('2020-01-01T00:00:01Z');
    await rm.fromRemote('{"ctl":"ping"}');
    time = DateTime.fromISO('2020-01-01T00:00:02Z');
    await rm.fromRemote('{"ctl":"pong"}');
    await rm.fromRemote('{"id":"00000000-4000-8000-0000-100010001000","call":{"name":"bar","params":{}}}');

    const r2p = rm.call('foo', {alice: 2}, cancellationToken);

    assert.strictEqual(rm.pending, 2);

    await rm.fromRemote('{"id":"00000000-4000-8000-0000-000000000000", "ret":{"eve":3}}');
    assert.strictEqual(rm.pending, 1);

    await rm.fromRemote('{"id":"00000000-4000-8000-0000-000000000000", "ret":{"eve":4}}'); // should be ignored
    await rm.fromRemote('{"id":"00000000-4000-8000-0000-000000000000", "err":{"code":"blue"}}'); // should be ignored

    const r1 = await r1p;
    assert.deepStrictEqual(calls, [
      {
        id: '00000000-4000-8000-0000-100010001000',
        call: {
          name: 'bar',
          params: {},
        }
      },
    ]);
    assert.deepStrictEqual(toRemotes, [
      '{"ctl":"init"}',
      '{"ctl":"ping"}',
      '{"ctl":"active"}',
      '{"id":"00000000-4000-8000-0000-000000000000","call":{"name":"foo","params":{"alice":1}}}',
      '{"ctl":"pong"}',
      '{"id":"00000000-4000-8000-0000-100010001000","ret":{"bob":2}}',
      '{"id":"00000000-4000-8000-0000-000000000001","call":{"name":"foo","params":{"alice":2}}}',
    ]);
    assert.strictEqual(1, pingCalls);
    assert.deepStrictEqual(r1, {eve: 3});

    assert.strictEqual(1000, rm.lag.as('milliseconds'));

    toRemotes.length = 0;
    await rm.fromRemote('{"id":"00000000-4000-8000-0000-100010001000","call":{"name":"x","params":{}}}');
    assert.deepStrictEqual(toRemotes, [
      '{"id":"00000000-4000-8000-0000-100010001000","err":{"code":"CALL_EXCEPTION","exception":{}}}'
    ])

    await rm.fromRemote('');
    assert.strictEqual(errors[0].error, 'exception');
    errors.length = 0;
    await rm.fromRemote('{}');
    assert.strictEqual(errors[0].error, 'invalid message data');

    cancellationToken.requestCancellation();
    assert.strictEqual(rm.pending, 0);
    try {
      await r2p;
      assert.fail();
    } catch (e) {
      assert.strictEqual(e.code, 'CALL_CANCELLED');
    }

    const r3p = rm.call('foo');
    await rm.fromRemote('{"id":"00000000-4000-8000-0000-000000000002","err":{"code":"RED"}}');
    try {
      await r3p;
      assert.fail();
    } catch (e) {
      assert.strictEqual(e.code, 'RED');
    }
    assert.strictEqual(rm.pending, 0);

    const r4p = rm.call('foo', {alice: 3}, cancellationTokenCtor());
    await rm.fromRemote('{"id":"00000000-4000-8000-0000-000000000003","ret":{"x":"y"}}');
    const r4 = await r4p;
    assert.deepStrictEqual(r4, {x:"y"});
  });
});
