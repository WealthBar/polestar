import {Draft, Immutable, produce} from 'immer';
import {deserialize, serializableType, serialize} from './serialize';
import {readonlyRegistryType} from './registry';
import {h64} from 'xxhashjs';
import {tuidCtorType} from './tuid';
import {pad} from './pad';

type immutableSerializableType = Immutable<serializableType>;

export type stateModifierFunctionType = (eventParams: serializableType, state: Draft<serializableType>) => void;

export type eventType = {
  name: string,
  params: serializableType,
};

export type eventPacketType = {
  event: eventType,
  clientId: string,
  eventId: string,
  eventRegistrySignature: string,
  postEventSignature: string,
};

export type starRepositoryType = {
  apply: (name: string, params: serializableType) => Promise<void>;
  onRemote: (message: string) => Promise<void>;
  readonly clientId: string;
  readonly pendingCount: number;
  readonly state: immutableSerializableType;
  readonly headState: immutableSerializableType;
  readonly stateSignature: string;
};

// Designed for where you have a single threaded websocket server that each
// client is sending events too and the server relays to all connected clients
// in the same order.
export function starRepositoryCtorCtor(tuidCtor: tuidCtorType) {
  return function starRepositoryCtor(
    eventRegistry: readonlyRegistryType<stateModifierFunctionType>,
    onLocal: (message: string) => Promise<void>,
    onError: (error: string, details: Record<string, unknown>) => void,
    initialState: serializableType = {},
  ): starRepositoryType {
    const clientId = tuidCtor();
    const localPendingEvents: { [id: string]: eventType } = {};

    let state: immutableSerializableType = produce(initialState, (x) => x);
    let headState: immutableSerializableType = state;
    let signatureValid = false;
    let signature = '';

    function computeStateSignature(invalidate = false): string {
      if (!signatureValid || invalidate) {
        const h = h64();
        h.update(serialize(state as serializableType));
        signatureValid = true;
        signature = pad('0000000000000000', h.digest().toString(16));
      }
      return signature;
    }

    async function apply(name: string, params: serializableType) {
      const stateModifier = eventRegistry.lookup(name);

      if (!stateModifier) {
        onError('NOT_IN_EVENT_REGISTRY', {name, local: true});
        return;
      }

      const eventId = tuidCtor();
      const event: eventType = {name, params};

      localPendingEvents[eventId] = event;

      state = produce(state, x => stateModifier(event.params, x));

      const packet: eventPacketType = {
        event,
        clientId,
        eventId,
        eventRegistrySignature: eventRegistry.signature,
        postEventSignature: computeStateSignature(true),
      };

      await onLocal(serialize(packet));
    }

    async function onRemote(message: string) {
      try {
        const eventPacket = deserialize<eventPacketType>(message);
        if (eventPacket.eventRegistrySignature !== eventRegistry.signature) {
          onError('ON_REMOTE_EVENT_REGISTRY_SIGNATURE_MISMATCH', {
              remoteSignature: eventPacket.eventRegistrySignature,
              localSignature: eventRegistry.signature,
            },
          );
          return;
        }

        if (eventPacket.clientId === clientId) {
          delete localPendingEvents[eventPacket.eventId];
        }

        const stateModifier = eventRegistry.lookup(eventPacket.event.name);

        // stateModifier can't be undefined here because of the signature check
        // typescript still insists we check it.
        // we can't test for the impossible, so exclude it from coverage

        // istanbul ignore next
        if (!stateModifier) {
          return;
        }

        const _state = state;
        state = produce(headState, x => stateModifier(eventPacket.event.params, x));

        computeStateSignature(true);
        if (eventPacket.postEventSignature !== signature) {
          onError('ON_REMOTE_STATE_SIGNATURE_MISMATCH', {
            signature,
            postEventSignature: eventPacket.postEventSignature,
          });
          state = _state;
          signatureValid = false;
          return;
        }

        headState = state;

        const localPendingEventIdsInOrder = Object.keys(localPendingEvents).sort();
        for (const id of localPendingEventIdsInOrder) {
          const event = localPendingEvents[id];
          const stateModifier = eventRegistry.lookup(event.name);

          // stateModifier can't be undefined here because we applied it already
          // as this is a local event being replayed.
          // we can't test for the impossible, so exclude it from coverage

          // istanbul ignore next
          if (!stateModifier) {
            continue;
          }

          state = produce(state, x => stateModifier(event.params, x));
        }
        signatureValid = false;
      } catch (exception) {
        onError('ON_REMOTE_EXCEPTION', {exception});
      }
    }

    return {
      apply,
      onRemote,
      get state() {
        return state;
      },
      get headState() {
        return headState;
      },
      get stateSignature() {
        computeStateSignature();
        return signature;
      },
      get clientId() {
        return clientId;
      },
      get pendingCount() {
        return Object.keys(localPendingEvents).length;
      },
    };
  };
}
