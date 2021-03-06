import {ctxWsType, wsHandlerType} from 'node_core';
import {readonlyRegistryCtor, resolvedUndefined, serializableType} from 'ts_agnostic';
import {wsEcho} from './echo';
import {wsLoginStatus} from './signup/login_status';
import {wsSendVerification} from './signup/send_verification';
import {wsCreateAccount} from './signup/create_account';
import {wsInitChallenge} from './signup/init_challenge';
import {wsVerifyLogin} from './signup/verify_login';
import {wsForgotPassword} from './signup/forgot_password';
import {wsChangePassword} from './signup/change_password';
import {wsAppWhoAmI} from './app/who_am_i';

export const wsHandlerRegistry = readonlyRegistryCtor<wsHandlerType>([
  ['echo', wsEcho],
  ['app/whoAmI', wsAppWhoAmI],
  ['signup/loginStatus', wsLoginStatus],
  ['signup/sendVerification', wsSendVerification],
  ['signup/createAccount', wsCreateAccount],
  ['signup/initChallenge', wsInitChallenge],
  ['signup/verifyLogin', wsVerifyLogin],
  ['signup/forgotPassword', wsForgotPassword],
  ['signup/changePassword', wsChangePassword],
]);

export async function wsOnConnectHandler(ctxWs: ctxWsType): Promise<serializableType> {
  console.log(`wsOnConnect: ${ctxWs?.user?.login || ctxWs.sessionId || 'wtf?'}`);
  return resolvedUndefined;
}

export async function wsOnCloseHandler(ctxWs: ctxWsType): Promise<serializableType> {
  console.log(`wsOnClose: ${ctxWs?.user?.login || ctxWs.sessionId || 'wtf?'}`);
  return resolvedUndefined;
}
