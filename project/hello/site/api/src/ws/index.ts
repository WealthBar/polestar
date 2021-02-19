import {ctxWsType, wsHandlerType} from 'node_core';
import {readonlyRegistryCtor, resolvedUndefined, serializableType} from 'ts_agnostic';
import {wsEcho} from './echo';
import {wsLoginStatus} from './signup/login_status';
import {wsSendVerification} from './signup/send_verification';
import {wsCreateAccount} from './signup/create_account';
import {wsInitChallenge} from './signup/init_challenge';
import {wsVerifyLogin} from './signup/verify_login';

export const wsHandlerRegistry = readonlyRegistryCtor<wsHandlerType>([
  ['echo', wsEcho],
  ['signup/loginStatus', wsLoginStatus],
  ['signup/sendVerification', wsSendVerification],
  ['signup/createAccount', wsCreateAccount],
  ['signup/initChallenge', wsInitChallenge],
  ['signup/verifyLogin', wsVerifyLogin],
]);

export async function wsOnConnectHandler(ctxWs: ctxWsType): Promise<serializableType> {
  console.log(`wsOnConnect: ${ctxWs?.user?.login || ctxWs.sessionId || 'wtf?'}`);
  return resolvedUndefined;
}

export async function wsOnCloseHandler(ctxWs: ctxWsType): Promise<serializableType> {
  console.log(`wsOnClose: ${ctxWs?.user?.login || ctxWs.sessionId || 'wtf?'}`);
  return resolvedUndefined;
}
