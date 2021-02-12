import {IncomingMessage, ServerResponse} from 'http';
import WebSocket from 'ws';
import {serializableType} from 'ts_agnostic';
import {registryType} from 'ts_agnostic';
import {dbProviderCtx} from './db_util';
import {dbProviderType} from './db';

export type urlType = {
  path: string,
  params: [string, string][],
}

export type ctxReqType = {
  sessionId: string;
  req: IncomingMessage,
  url: urlType,
  session: Record<string, serializableType>,
  db: dbProviderCtx,
  dbProvider: dbProviderType,
  cookie: [string, string][],
  permission?: { [name: string]: boolean },
  user?: { login: string },
}

export type webSocketExtendedType =
  WebSocket
  & {
  isAlive: boolean;
};

export type requestType = {
  id: string,
  ctxWs: ctxWsType,
  resolve: (r: serializableType) => void,
  reject: (r: serializableType) => void,
  data: string,
  sent: boolean,
};

export type ctxWsType = {
  ws: webSocketExtendedType,
  call(name: string, params: serializableType): Promise<serializableType>,
  sessionId: string,
  session: Record<string, serializableType>,
  requests: registryType<requestType>,
  permission?: { [name: string]: boolean },
  user?: { login: string },
  db: dbProviderCtx,
  dbProvider: dbProviderType,
}

export type ctxType = ctxReqType & {
  res: ServerResponse,
}

type userType = {
  login: string;
  display_name: string;
};

export type userStoreType = {
  [userId: string]: userType
}

export type gauthUserInfoType = {
  email: string;
  email_verified: boolean;
  name: string;
  picture: string;
  given_name: string;
  family_name: string;
  locale: string;
};

export type contentHandlerType = (ctx: ctxType) => Promise<void>;
export type reqHandlerType = (ctx: ctxReqType) => Promise<void>;

export type serverSettingsType = {
  host: string;
  port: string | number;
  schema: string;
  sessionSecret: string;
  google?: {
    secret: string;
    redirectUri: string;
    id: string;
  },
  dbConnectionString: string,
};

export type wsHandlerType = (ctxWs: ctxWsType, callParams: serializableType | undefined) => Promise<serializableType | undefined>;
