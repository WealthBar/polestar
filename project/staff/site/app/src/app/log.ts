import {serializableType} from '../../../api/src/agnostic/serialize';

export async function logCallHandler(params: serializableType | undefined): Promise<serializableType | undefined> {
  console.log(params);
  return undefined;
}
