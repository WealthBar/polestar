import '@/vue_comp';
import {limitedMemoFCtor} from 'ts_agnostic';
import {rateLimitEmitLast} from 'ts_browser';
import {ws} from '@/ws';
import {reactive} from '@vue/composition-api';
import {callTrackerCtor} from "vue_workflow";

const delayTimeMilliseconds = 100;
export type loginStatusType = { login: string; inUse: boolean; allowGoogleLogin: boolean };
const wsSignupLoginStatus = ws.callCtor<{ login: string }, loginStatusType>(
  'signup/loginStatus',
  {
    login: '',
    inUse: false,
    allowGoogleLogin: false,
  },
);
const wsLimitedMemoLoginStatus = limitedMemoFCtor(15000, wsSignupLoginStatus, (p) => p.login);
const wsSignupSendVerification = ws.callCtor<{ login: string }, { nb64: string }>('signup/sendVerification');
const wsSignupForgotPassword = ws.callCtor<{ login: string }, { nb64: string }>('signup/forgotPassword');
const wsSignupChangePassword = ws.callCtor<{ login: string; code: string; nb64: string; hpnb64: string }, Record<string, never>>('signup/changePassword');
const wsSignupCreateAccount = ws.callCtor<{ login: string; code: string; nb64: string; hpnb64: string }, Record<string, never>>('signup/createAccount');
const wsSignupInitChallenge = ws.callCtor<{ login: string }, { nb64: string; r: string; salt: string }>('signup/initChallenge');
const wsSignupVerifyLogin = ws.callCtor<{ login: string; fb64: string }, Record<string, never>>('signup/verifyLogin');

function liftLoginStatusResult(to: loginStatusType, from?: Partial<loginStatusType>) {
  to.login = from?.login || '';
  to.inUse = !!from?.inUse;
  to.allowGoogleLogin = !!from?.allowGoogleLogin;
}

const loginStatus = reactive({login: '', inUse: false, allowGoogleLogin: false});

export const deps = {window};

const tracker = callTrackerCtor(deps.window.setTimeout, delayTimeMilliseconds * 2);

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
const sendVerification = (params: Parameters<typeof wsSignupSendVerification>[0]) => {
  return tracker(() => wsSignupSendVerification(params));
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
const forgotPassword = (params: Parameters<typeof wsSignupForgotPassword>[0]) => {
  return tracker(() => wsSignupForgotPassword(params));
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
const changePassword = (params: Parameters<typeof wsSignupChangePassword>[0]) => {
  return tracker(() => wsSignupChangePassword(params));
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
const createAccount = (params: Parameters<typeof wsSignupCreateAccount>[0]) => {
  return tracker(() => wsSignupCreateAccount(params));
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
const initChallenge = (params: Parameters<typeof wsSignupInitChallenge>[0]) => {
  return tracker(() => wsSignupInitChallenge(params));
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
const verifyLogin = (params: Parameters<typeof wsSignupVerifyLogin>[0]) => {
  return tracker(() => wsSignupVerifyLogin(params));
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
const updateLoginStatusImmediate = async (params: Parameters<typeof wsSignupLoginStatus>[0]) => {
  liftLoginStatusResult(loginStatus, await tracker(() => wsSignupLoginStatus(params)));
}

const rlLoginStatus = rateLimitEmitLast(
  delayTimeMilliseconds,
  wsLimitedMemoLoginStatus,
  (result) => liftLoginStatusResult(loginStatus, result),
);

async function updateLoginStatus(params: { login: string }): Promise<void> {
  const login = params.login;
  if (!login.match(/[^@]+@[^@]+\.[^@]+/)) {
    return;
  }
  await rlLoginStatus(params);
}

export const wsSignup = {
  callsOutstanding: tracker.callsOutstanding,
  loginStatus,
  sendVerification,
  forgotPassword,
  changePassword,
  createAccount,
  initChallenge,
  verifyLogin,
  updateLoginStatus,
  updateLoginStatusImmediate,
};
