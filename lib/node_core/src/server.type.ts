import {IncomingMessage, ServerResponse} from 'http';
import WebSocket from 'ws';
import {serializableType} from 'ts_agnostic';
import {registryType} from 'ts_agnostic';

export type urlType = {
  path: string,
  params: [string, string][],
}

export type ctxReqType = {
  sessionId: string;
  req: IncomingMessage,
  url: urlType,
  session: sessionType,
  user?: userType,
  cookie: [string, string][],
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
  ws: webSocketExtendedType;
  call(name: string, params: serializableType): Promise<serializableType>;
  sessionId: string;
  session: sessionType;
  user?: userType;
  requests: registryType<requestType>;
}

export type ctxType = ctxReqType & {
  res: ServerResponse,
}

type userType = {
  userId: string;
  email: string;
  email_verified: boolean;
  name: string;
  picture: string;
  given_name: string;
  family_name: string;
  locale: string;
  rawAuthResponse: string;
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
export type sessionType = {
  userId?: string;
  [key: string]: unknown;
};
export type sessionStoreType = {
  [sessionId: string]: sessionType;
};
export type contentHandlerType = (ctx: ctxType) => Promise<void>;
export type reqHandlerType = (ctx: ctxReqType) => Promise<void>;

export type serverSettingsType = {
  host: string;
  port: string|number;
  schema: string;
  sessionSecret: string;
  google?: {
    secret: string;
    redirectUri: string;
    id: string;
  },
};

export type wsHandlerType = (ctxWs: ctxWsType, callParams: serializableType | undefined) => Promise<serializableType | undefined>;
