import {tuidCtor} from '../../../../libs/agnostic/src/tuid';
import {registryCtor, registryCtorType, registryType} from '../../../../libs/agnostic/src/registry';
import {eventPacketType, starRepositoryCtor, stateModifierFunctionType} from '../../../../libs/agnostic/src/star_repo';

// --helper for testing---------------------------------------------------------

function testingPubSubCtor(registryCtor: registryCtorType) {
  type MessageHandler = (message: string) => Promise<void>;
  const subs = registryCtor<MessageHandler>();
  const pendingMessages: string[] = [];

  function sub(handler: MessageHandler) {
    return subs.register(tuidCtor(), handler);
  }

  async function pub(message: string) {
    pendingMessages.push(message);
  }

  async function play(n: number = 1) {
    if (n > pendingMessages.length) {
      n = pendingMessages.length;
    }
    if (n === 0) {
      return;
    }
    const messages = pendingMessages.splice(0, n);

    return Promise.all(messages.map(message => subs.values.map(async handler => {
      const p : eventPacketType = JSON.parse(message);
      p.event.orderingId = tuidCtor(); // emulate server ordering the events
      return handler(JSON.stringify(p));
    })).flat());
  }

  return {pub, sub, play};
}

// --test setup-----------------------------------------------------------------
const messageBus = testingPubSubCtor(registryCtor);

function onError(error: string) {
  console.error(error);
}

// setup the event mapping used by all clients
const eventRegistry: registryType<stateModifierFunctionType> = registryCtor<stateModifierFunctionType>();

eventRegistry.register(
  'test',
  (eventParams, state) => {
    Object.entries(eventParams).forEach(([key, value]) => state[key] = value);
  });

eventRegistry.register(
  'inca',
  (eventParams, state) => {
    state.a = state.a as number + 1;
  });


console.log(eventRegistry.signature);

function createClient() {
  const client = starRepositoryCtor(eventRegistry, messageBus.pub, onError, {a: 0});
  messageBus.sub(message => client.onRemote(message));
  return client;
}


(async function () {
  const client1 = createClient();
  const client2 = createClient();
  const client3 = createClient();

  const log = () => {
    console.log(
      client1.headState,
      client1.state,
      client1.pendingCount,
      '|',
      client2.headState,
      client2.state,
      client2.pendingCount,
      '|',
      client3.headState,
      client3.state,
      client3.pendingCount);
  };

  await client1.apply('test', {a: 1});
  log();

  await client2.apply('test', {a: 2});
  log();

  await client3.apply('test', {a: 3});
  log();

  await messageBus.play();
  log();

  await client1.apply('inca', {});
  log();

  await client1.apply('inca', {});
  log();

  await client1.apply('inca', {});
  log();

  await messageBus.play();
  log();

  await messageBus.play();
  log();

  await client2.apply('inca', {});
  log();

  await messageBus.play();
  log();

  await messageBus.play();
  log();

  await messageBus.play();
  log();

  await client3.apply('test', {a: 4});
  log();

  await messageBus.play();
  log();

  await messageBus.play();
  log();

  await messageBus.play();
  log();
})();
