/* eslint-disable @typescript-eslint/camelcase */
import {limitedMemoFCtor} from 'ts_agnostic';
import Vue from 'vue';
import {rateLimitEmitLast} from 'ts_browser';
import {ws} from '@/ws';

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

function liftLoginStatusResult(to: loginStatusType, from: Partial<loginStatusType>) {
  to.login = from.login || '';
  to.inUse = !!from.inUse;
  to.allowGoogleLogin = !!from.allowGoogleLogin;
}

export const wsSignupMixin = Vue.extend({
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
      if (this.$data.$_wsCallsOutstanding === 1) {
        setTimeout(() => --this.$data.$_wsCallsOutstanding, delayTimeMilliseconds * 2);
      } else {
        --this.$data.$_wsCallsOutstanding;
      }
      return r;
    },
    $wsSignupSendVerification(params: Parameters<typeof wsSignupSendVerification>[0]) {
      return this.$wsTrackCall(() => wsSignupSendVerification(params));
    },
    $wsSignupForgotPassword(params: Parameters<typeof wsSignupForgotPassword>[0]) {
      return this.$wsTrackCall(() => wsSignupForgotPassword(params));
    },
    $wsSignupChangePassword(params: Parameters<typeof wsSignupChangePassword>[0]) {
      return this.$wsTrackCall(() => wsSignupChangePassword(params));
    },
    $wsSignupCreateAccount(params: Parameters<typeof wsSignupCreateAccount>[0]) {
      return this.$wsTrackCall(() => wsSignupCreateAccount(params));
    },
    $wsSignupInitChallenge(params: Parameters<typeof wsSignupInitChallenge>[0]) {
      return this.$wsTrackCall(() => wsSignupInitChallenge(params));
    },
    $wsSignupVerifyLogin(params: Parameters<typeof wsSignupVerifyLogin>[0]) {
      return this.$wsTrackCall(() => wsSignupVerifyLogin(params));
    },
    async $wsSignupUpdateLoginStatusImmediate(params: Parameters<typeof wsSignupLoginStatus>[0]) {
      liftLoginStatusResult(this.$data.$_wsLoginStatus, await this.$wsTrackCall(() => wsSignupLoginStatus(params)));
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    $wsSignupUpdateLoginStatus(params: { login: string }): void {
      // replace with rate limited version on first call.
      // this insures 'this' is bound correctly.
      const f = rateLimitEmitLast(
        delayTimeMilliseconds,
        wsLimitedMemoLoginStatus,
        (result) => liftLoginStatusResult(this.$data.$_wsLoginStatus, result),
      );
      this.$wsSignupUpdateLoginStatus = (params: { login: string }) => {
        const login = params.login;
        if (!login.match(/[^@]+@[^@]+\.[^@]+/)) { // && this.$data.$_wsLoginStatus.login === login) {
          return;
        }
        f(params);
      };

      this.$wsSignupUpdateLoginStatus(params);
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
