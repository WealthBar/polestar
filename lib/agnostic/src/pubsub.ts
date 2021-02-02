import {registryCtorType} from './registry';
import {tuidCtorType} from './tuid';

export type pubSubMessageHandlerType = (message: string) => Promise<void>;

export type pubSubPlayType = {
  pub(message: string): Promise<void>,
  sub(handler: pubSubMessageHandlerType): () => void,
  play(n: number): Promise<void>,
};
export type pubSubPlayCtorType = () => pubSubPlayType;
export type pubSubPlayCtorCtorType = (tuidCtor: tuidCtorType, registryCtor: registryCtorType) => pubSubPlayCtorType;

export function pubSubPlayCtorCtor(tuidCtor: tuidCtorType, registryCtor: registryCtorType): pubSubPlayCtorType {
  return function pubSubPlayCtor(): pubSubPlayType {
    const subs = registryCtor<pubSubMessageHandlerType>();
    const pendingMessages: string[] = [];

    function sub(handler: pubSubMessageHandlerType): () => void {
      return subs.register(tuidCtor(), handler);
    }

    async function pub(message: string): Promise<void> {
      pendingMessages.push(message);
    }

    async function play(n:number): Promise<void> {
      if (n > pendingMessages.length) {
        n = pendingMessages.length;
      }
      if (n <= 0) {
        return;
      }
      const messages = pendingMessages.splice(0, n);

      await Promise.all(
        messages
          .map(
            message =>
              subs
                .values
                .map(
                  async handler => handler(message),
                ),
          )
          .flat(),
      );
    }

    return {pub, sub, play};
  };
}


export type pubSubType = {
  pub(message: string): Promise<void>,
  sub(handler: pubSubMessageHandlerType): () => void,
};

export type pubSubCtorType = () => pubSubType;
export type pubSubCtorCtorType = (tuidCtor: tuidCtorType, registryCtor: registryCtorType) => pubSubCtorType;

export function pubSubCtorCtor(tuidCtor: tuidCtorType, registryCtor: registryCtorType): pubSubCtorType {
  return function pubSubCtor(): pubSubType {
    const subs = registryCtor<pubSubMessageHandlerType>();

    function sub(handler: pubSubMessageHandlerType): () => void {
      return subs.register(tuidCtor(), handler);
    }

    async function pub(message: string): Promise<void> {
      await Promise.all(
        subs
          .values
          .map(
            async handler => handler(message),
          )
          .flat(),
      );
    }

    return {pub, sub};
  };
}
