/* eslint-disable @typescript-eslint/camelcase */
import '@/vue_comp';
import {limitedMemoFCtor} from 'ts_agnostic';
import {rateLimitEmitLast} from 'ts_browser';
import {ws} from '@/ws';
import {reactive} from '@vue/composition-api';

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
const wsSignupChangePassword = ws.callCtor<{ login: string; code: string; nb64: string; hpnb64: string }, {}>('signup/changePassword');
const wsSignupCreateAccount = ws.callCtor<{ login: string; code: string; nb64: string; hpnb64: string }, {}>('signup/createAccount');
const wsSignupInitChallenge = ws.callCtor<{ login: string }, { nb64: string; r: string; salt: string }>('signup/initChallenge');
const wsSignupVerifyLogin = ws.callCtor<{ login: string; fb64: string }, {}>('signup/verifyLogin');

function liftLoginStatusResult(to: loginStatusType, from?: Partial<loginStatusType>) {
  to.login = from?.login || '';
  to.inUse = !!from?.inUse;
  to.allowGoogleLogin = !!from?.allowGoogleLogin;
}

const state =
  reactive({
    callsOutstanding: 0,
    loginStatus: {login: '', inUse: false, allowGoogleLogin: false},
  });


async function trackCall<T>(f: () => Promise<T>): Promise<T> {
  ++state.callsOutstanding;

  try {
    return await f();
  } catch (e) {
    console.error(e);
    throw e;
  } finally {
    // delay the decrement to help smooth out 1->0->1->0->1->0 flicker caused
    // by updates that are watching $wsOutstanding and updating UI elements
    if (state.callsOutstanding === 1) {
      setTimeout(() => --state.callsOutstanding, delayTimeMilliseconds * 2);
    } else {
      --state.callsOutstanding;
    }
  }
}

async function sendVerification(params: Parameters<typeof wsSignupSendVerification>[0]) {
  return trackCall(() => wsSignupSendVerification(params));
}

async function forgotPassword(params: Parameters<typeof wsSignupForgotPassword>[0]) {
  return trackCall(() => wsSignupForgotPassword(params));
}

async function changePassword(params: Parameters<typeof wsSignupChangePassword>[0]) {
  return trackCall(() => wsSignupChangePassword(params));
}

async function createAccount(params: Parameters<typeof wsSignupCreateAccount>[0]) {
  return trackCall(() => wsSignupCreateAccount(params));
}

async function initChallenge(params: Parameters<typeof wsSignupInitChallenge>[0]) {
  return trackCall(() => wsSignupInitChallenge(params));
}

async function verifyLogin(params: Parameters<typeof wsSignupVerifyLogin>[0]) {
  return trackCall(() => wsSignupVerifyLogin(params));
}

async function updateLoginStatusImmediate(params: Parameters<typeof wsSignupLoginStatus>[0]) {
  liftLoginStatusResult(state.loginStatus, await trackCall(() => wsSignupLoginStatus(params)));
}

const rlLoginStatus = rateLimitEmitLast(
  delayTimeMilliseconds,
  wsLimitedMemoLoginStatus,
  (result) => liftLoginStatusResult(state.loginStatus, result),
);

async function updateLoginStatus(params: { login: string }): Promise<void> {
  const login = params.login;
  if (!login.match(/[^@]+@[^@]+\.[^@]+/)) {
    return;
  }
  await rlLoginStatus(params);
}

export const wsSignup = {
  state,
  sendVerification,
  forgotPassword,
  changePassword,
  createAccount,
  initChallenge,
  verifyLogin,
  updateLoginStatus,
  updateLoginStatusImmediate,
};
