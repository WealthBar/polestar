import {wsCtor} from 'ts_browser';

export const deps = {window};

function apiHostName(): string {
  const m = deps.window.location.hostname.toLowerCase().match(/(?<domain>[^.]+\.[^.]+$)/);
  return 'api.' + m?.groups?.domain;
}

const ws = wsCtor(apiHostName());

export const apiLoginStatus = ws.callCtor<{ login: string }, { inUse: boolean; allowGoogleLogin: boolean }>(
  'signup/loginStatus',
  {
    inUse: false,
    allowGoogleLogin: false,
  },
);

export const apiSendVerification = ws.callCtor<{ login: string }, { nb64: string }>('signup/sendVerification');

export const apiCreateAccount = ws.callCtor<{ login: string; code: string; nb64: string; hpnb64: string }, {}>('signup/createAccount');

export const apiInitChallenge = ws.callCtor<{ login: string }, { nb64: string; r: string; salt: string }>('signup/initChallenge');

export const apiVerifyLogin = ws.callCtor<{ login: string; fb64: string }, {}>('signup/verifyLogin');
