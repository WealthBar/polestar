import {ctxWsType, wsHandlerType} from 'node_core';
import {readonlyRegistryCtor, resolvedUndefined, serializableType} from 'ts_agnostic';
import {wsEcho} from './echo';
import {wsEmailStatus} from './signup/email_status';
import {wsEmailSendVerification} from './signup/email_send_verification';
import {wsEmailCreateAccount} from './signup/email_create_account';

export const wsHandlerRegistry = readonlyRegistryCtor<wsHandlerType>([
  ['echo', wsEcho],
  ['signup/emailStatus', wsEmailStatus],
  ['signup/emailSendVerification', wsEmailSendVerification],
  ['signup/emailCreateAccount', wsEmailCreateAccount],
]);

export async function wsOnConnectHandler(ctxWs: ctxWsType): Promise<serializableType> {
  console.log(`wsOnConnect: ${ctxWs?.user?.login || ctxWs.sessionId || 'wtf?'}`);
  return resolvedUndefined;
}

export async function wsOnCloseHandler(ctxWs: ctxWsType): Promise<serializableType> {
  console.log(`wsOnClose: ${ctxWs?.user?.login || ctxWs.sessionId || 'wtf?'}`);
  return resolvedUndefined;
}
