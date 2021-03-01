/* eslint-disable @typescript-eslint/camelcase */
import {rateLimitEmitLast, wsCtor} from 'ts_browser';
import Vue from 'vue';
import {limitedMemoFCtor} from 'ts_agnostic';

export const deps = {window};

const delayTimeMilliseconds = 100;

function wsHostName(): string {
  const m = deps.window.location.hostname.toLowerCase().match(/(?<domain>[^.]+\.[^.]+$)/);
  return 'api.' + m?.groups?.domain;
}

const ws = wsCtor(wsHostName());

export type loginStatusType = { login: string; inUse: boolean; allowGoogleLogin: boolean };

const wsLoginStatus = ws.callCtor<{ login: string }, loginStatusType>(
  'signup/loginStatus',
  {
    login: '',
    inUse: false,
    allowGoogleLogin: false,
  },
);


const wsLimitedMemoLoginStatus = limitedMemoFCtor(15000, wsLoginStatus, (p) => p.login);

const wsSendVerification = ws.callCtor<{ login: string }, { nb64: string }>('signup/sendVerification');
const wsForgotPassword = ws.callCtor<{ login: string }, { nb64: string }>('signup/forgotPassword');
const wsCreateAccount = ws.callCtor<{ login: string; code: string; nb64: string; hpnb64: string }, {}>('signup/createAccount');
const wsInitChallenge = ws.callCtor<{ login: string }, { nb64: string; r: string; salt: string }>('signup/initChallenge');
const wsVerifyLogin = ws.callCtor<{ login: string; fb64: string }, {}>('signup/verifyLogin');

function liftLoginStatusResult(to: loginStatusType, from: Partial<loginStatusType>) {
  to.login = from.login || '';
  to.inUse = !!from.inUse;
  to.allowGoogleLogin = !!from.allowGoogleLogin;
}

export const wsMixin = Vue.extend({
  data() {
    return {
      $_wsCallsOutstanding: 0,
      $_wsLoginStatus: {login: '', inUse: false, allowGoogleLogin: false},
    };
  },
  methods: {
    async $wsTrackCall<T>(f: () => Promise<T>): Promise<T> {
      ++this.$data.$_wsCallsOutstanding;
      const r = await f();
      // delay the decrement to help smooth out 1->0->1->0->1->0 flicker caused
      // by updates that are watching $wsOutstanding and updating UI elements
      setTimeout(() => --this.$data.$_wsCallsOutstanding, delayTimeMilliseconds);
      return r;
    },
    $wsSendVerification(params: Parameters<typeof wsSendVerification>[0]) {
      return this.$wsTrackCall(() => wsSendVerification(params));
    },
    $wsForgotPassword(params: Parameters<typeof wsForgotPassword>[0]) {
      return this.$wsTrackCall(() => wsForgotPassword(params));
    },
    $wsCreateAccount(params: Parameters<typeof wsCreateAccount>[0]) {
      return this.$wsTrackCall(() => wsCreateAccount(params));
    },
    $wsInitChallenge(params: Parameters<typeof wsInitChallenge>[0]) {
      return this.$wsTrackCall(() => wsInitChallenge(params));
    },
    $wsVerifyLogin(params: Parameters<typeof wsVerifyLogin>[0]) {
      return this.$wsTrackCall(() => wsVerifyLogin(params));
    },
    async $wsUpdateLoginStatusImmediate(params: Parameters<typeof wsLoginStatus>[0]) {
      liftLoginStatusResult(this.$data.$_wsLoginStatus, await this.$wsTrackCall(() => wsLoginStatus(params)));
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    $wsUpdateLoginStatus(params: { login: string }): void {
      // replace with rate limited version on first call.
      // this insures 'this' is bound correctly.
      const f = rateLimitEmitLast(
        delayTimeMilliseconds,
        wsLimitedMemoLoginStatus,
        (result) => liftLoginStatusResult(this.$data.$_wsLoginStatus, result),
      );
      this.$wsUpdateLoginStatus = (params: { login: string }) => {
        const login = params.login;
        if (!login.match(/[^@]+@[^@]+\.[^@]+/)) { // && this.$data.$_wsLoginStatus.login === login) {
          return;
        }
        f(params);
      };

      this.$wsUpdateLoginStatus(params);
    },
  },
  computed: {
    $wsOutstanding(): boolean {
      return this.$data.$_wsCallsOutstanding > 0;
    },
    $wsLoginStatus() {
      return this.$data.$_wsLoginStatus;
    },
  },
});

