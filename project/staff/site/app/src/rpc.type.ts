import {serializableType} from '../../api/src/agnostic/serialize';

export type callHandler = (params: serializableType | undefined) => Promise<serializableType | undefined>;
