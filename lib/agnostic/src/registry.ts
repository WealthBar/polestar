import {h64} from 'xxhashjs';
import {pad} from './pad';

export type readonlyRegistryType<T> = {
  signature: string; // hash of the names and items (via toString)
  lookup(name: string): T | undefined; // lookup an item by name
  values: T[]; // all items (no implied order)
  valuesOrderedByKey: T[]; // all items (with order)
  names: string[]; // all names (no implied order)
};

export type registryType<T> = readonlyRegistryType<T> & {
  register(name: string, item: T): () => void; // register a new item, returns unregister function
  clear(): void;
  remove(name: string): T | undefined;
  lock(): void;
};

export function readonlyRegistryCtor<T extends { toString(): string }>(items: [string,T][]): readonlyRegistryType<T> { // T has to have .toString()
  const registry: { [name: string]: T } = {};
  let signature = '';

  function lookup(name: string): T {
    return registry[name];
  }

  {
    const h = h64();
    for (const item of items) {
      registry[item[0]] = item[1];
      h.update(item[0]);
    }
    signature = pad('0000000000000000', h.digest().toString(16));
  }

  return {
    lookup,
    get valuesOrderedByKey(): T[] {
      return Object.keys(registry).sort().map(k => registry[k]);
    },
    get values(): T[] {
      return Object.values(registry);
    },
    get names(): string[] {
      return Object.keys(registry);
    },
    get signature(): string {
      return signature;
    },
  };
}

// --generic registry system----------------------------------------------------
export function registryCtor<T extends { toString(): string }>(): registryType<T> { // T has to have .toString()
  let registry: { [name: string]: T } = {};
  let signature = '';
  let signatureValid = false;
  let locked = false;

  function lock() {
    locked = true;
  }

  function register(name: string, item: T): () => void {
    if (locked) { throw new Error('Locked'); }
    if (registry[name]) {
      throw {exception: new Error(), error: 'DUPLICATE', name};
    }
    registry[name] = item;
    signatureValid = false;
    return () => {
      if (locked) { throw new Error('Locked'); }
      if (registry[name] === item) {
        delete registry[name];
      }
      signatureValid = false;
    };
  }

  function lookup(name: string): T {
    return registry[name];
  }

  function clear() {
    if (locked) { throw new Error('Locked'); }
    registry = {};
  }

  function computeSignature(): string {
    if (!signatureValid) {
      const keys = Object.keys(registry).sort();
      const h = h64();
      for (const key of keys) {
        h.update(key);
      }
      signatureValid = true;
      signature = pad('0000000000000000', h.digest().toString(16));
    }
    return signature;
  }

  function remove(name: string): T | undefined {
    if (locked) { throw new Error('Locked'); }
    const t = registry[name];
    delete registry[name];
    return t;
  }

  return {
    register,
    lookup,
    clear,
    remove,
    get valuesOrderedByKey(): T[] {
      return Object.keys(registry).sort().map(k => registry[k]);
    },
    get values(): T[] {
      return Object.values(registry);
    },
    get names(): string[] {
      return Object.keys(registry);
    },
    get signature(): string {
      return computeSignature();
    },
    lock,
  };
}

export type registryCtorType = typeof registryCtor;
