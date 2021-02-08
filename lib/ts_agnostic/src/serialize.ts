import * as stringify from 'json-stable-stringify';

type serializablePrimitiveType = string | number | boolean | null | undefined;
export type serializableType =
  { [key: string]: serializableType | serializableType[] | serializablePrimitiveType | serializablePrimitiveType[] }
  | serializablePrimitiveType;

export function serialize(what: serializableType): string {
  return stringify(what);
}

export function deserialize<T extends serializableType>(serialized: string): T {
  return JSON.parse(serialized) as T;
}
