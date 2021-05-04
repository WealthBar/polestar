import {serializableType} from "ts_agnostic";

export type woActionType = {
  name: string,
  params: Record<string, string>, // cause pdf form's are all string:string
  sig?: string,
};
export type woSignType = {
  envId: string,
  url: string,
  signed: boolean
};
export type woStateType = {
  navHistory: string[],
  step?: Record<string, Record<string, serializableType>>,
  contentHash?: string,
  sign?: woSignType,
  action?: woActionType,
};
export type woOpType = {
  contextName: string,
} & (
  {
    op: 'UPDATE' | 'SIGN' | 'COMMIT',
    states?: woStateType[],
  } | {
  op: 'RESUME',
  contentHash?: string,
}
  );
export type woMetadataType = {
  contextName: string,
  currentContentHash: string,
  woId: string,
  frozenAt?: string,
  computed?: Record<string, serializableType>,
};

export type woOpResultType = {
  res?: {
    states: woStateType[],
    metadata: woMetadataType,
  };
  err?: string;
} | undefined;