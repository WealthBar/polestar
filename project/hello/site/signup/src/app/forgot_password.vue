<template>
  <div>
    <form ref="form_ep" @submit.prevent="submit">
      <b-field
          label="Email Address"
      >
        <b-input ref="email"
            type="email"
            name="email"
            placeholder="alice@example.com"
            v-model="email"
            @focus="emailFocus"
            @blur="emailBlur"
        />
      </b-field>
      <b-field
          label="New Password"
      >
        <b-input
            type="password"
            name="password"
            minlength="8"
            placeholder="super secret password"
            password-reveal
            v-model="password"
            @focus="passwordFocus"
        />
      </b-field>
      <b-field
          label="Code"
      >
        <b-input
            type="text"
            minlength="8"
            maxlength="8"
            name="code"
            @focus="codeFocus"
            @blur="codeBlur"
            placeholder="00000000"
            v-model="code"
        />
      </b-field>
      <div class="columns is-mobile">
        <div class="column is-narrow ml-1">
          <b-button type="is-primary is-light">
            <!--           @click="sendForgotCode" :disabled="getForgotCodeDisabled">-->
            Send Code
          </b-button>
        </div>
        <div class="column p-0"></div>
        <div class="column is-pulled-right is-narrow">
          <!--          :disabled="loginDisabled"-->
          <b-button :loading="$wsOutstanding" type="is-primary" native-type="submit"
              icon-right="arrow-right">
            Login
          </b-button>
        </div>
      </div>
      <b-notification :closable="false" type="is-success">
        tbd
      </b-notification>
    </form>
  </div>

</template>

<script lang="ts">

import {wsMixin} from '@/ws';
import mixins from 'vue-typed-mixins';

export const deps = {window};

export default mixins(wsMixin).extend({
  name: 'forgotPassword',
  data() {
    return {
      email: '',
      inEmail: true,
      password: '',
      mode: 'signup',
      formValid: false,
      veValid: false,
      emailValid: false,
      passwordValid: false,
      loginStatus: {
        inUse: false,
        allowGoogleLogin: false,
        email: '',
      },
      showForgot: false,
      forgotCodeSent: false,
      loginFailed: false,
      current: 'signupInfo',
      code: '',
      inCode: false,
      codeInvalid: false,
      loading: false,
      unknownError: false,
      nb64: '',
      pendingCallCount: 0,
      getForgotCodeBlocked: false,
    };
  },
  created() {
    // ['email', 'code', 'password'].forEach((field) => {
    //   this.$watch(field, this.updateEpValid);
    // });
  },
  methods: {

    // async checkEmailInUse() {
    //   if (this.loginStatus.email === this.email) {
    //     return;
    //   }
    //   const login = this.email;
    //   const r = await this.np(() => apiLoginStatus({login}));
    //   if (this.email === login) {
    //     this.loginStatus.email = login;
    //     this.loginStatus.inUse = r.inUse || false;
    //     this.loginStatus.allowGoogleLogin = r.allowGoogleLogin || false;
    //   }
    // },
    // async sendForgotCode() {
    //   this.loading = true;
    //   this.getForgotCodeBlocked = false;
    //   const {error, nb64} = await this.np(() => apiForgotPassword({login: this.email}));
    //   if (error) {
    //     this.unknownError = true;
    //     this.nb64 = '';
    //   } else {
    //     this.nb64 = nb64;
    //     setTimeout(() => {
    //       this.getForgotCodeBlocked = true;
    //     }, 30000);
    //   }
    //   this.forgotCodeSent = true;
    //   setTimeout(() => {
    //     this.forgotCodeSent = false;
    //   }, 1000);
    //   this.loading = false;
    // },
    emailFocus() {
      this.loginFailed = false;
      this.inEmail = true;
    },
    passwordFocus() {
      this.loginFailed = false;
    },
    emailBlur() {
      this.inEmail = false;
    },
    codeFocus() {
      this.inCode = true;
    },
    codeBlur() {
      this.inCode = false;
    },
    async submit() {
      //
    },
    // async submitLogin() {
    //   await this.checkEmailInUse();
    //   this.loading = true;
    //   if (this.modeSignup) {
    //     this.current = 'accountCreation';
    //     const {error, nb64} = await this.np(() => apiSendVerification({login: this.email}));
    //     if (error) {
    //       this.unknownError = true;
    //       this.nb64 = '';
    //     } else {
    //       this.nb64 = nb64;
    //     }
    //     this.loading = false;
    //   }
    //   if (this.modeSignin) {
    //     const {nb64, r, salt, error} = await this.np(() => apiInitChallenge({login: this.email}));
    //     if (nb64 && r && salt && !error) {
    //       const {fb64} = crClientResponse(r, nb64, salt, this.password);
    //       const {error} = await this.np(() => apiVerifyLogin({login: this.email, fb64}));
    //       if (error) {
    //         this.loginFailed = true;
    //         this.loading = false;
    //       } else {
    //         const url = deps.window.location.toString().replace(/sign(up|in)\./, 'app.');
    //         console.log('redirect', url);
    //         deps.window.location.replace(url);
    //       }
    //     }
    //   }
    // },
    // async submitCode() {
    //   if (!this.nb64) {
    //     this.unknownError = true;
    //     return;
    //   }
    //   this.unknownError = false;
    //   this.loading = true;
    //   const {hpnb64} = crClientSetupInit(this.password, this.nb64);
    //   const r = await this.np(() => apiCreateAccount({
    //     login: this.email,
    //     code: this.code,
    //     nb64: this.nb64 || '',
    //     hpnb64,
    //   }));
    //   if (r.error) {
    //     this.codeInvalid = true;
    //   } else {
    //     console.log('redirect', deps.window.location.toString().replace(/sign(up|in)\./, 'app.'));
    //   }
    // },
    // back() {
    //   this.current = 'signupInfo';
    // },
    // updateEpValid() {
    //   this.loginFailed = false;
    //   this.emailValid = !!this.email.match(/[^@]+@[^@]+\.[^@.]+/);
    //   this.passwordValid = this.password.length >= 8;
    //   this.epValid = this.emailValid && this.passwordValid;
    //   if (this.emailValid) {
    //     this.rateLimitedCheckEmailInUse();
    //   }
    // },
    // updateVeValid() {
    //   this.veValid = this.code.length === 8;
    // },
    // googleLogin() {
    //   // todo
    // },
    // switchModeToSignin() {
    //   this.mode = 'signin';
    //   this.rateLimitedCheckEmailInUse();
    // },
    // switchModeToSignup() {
    //   this.mode = 'signup';
    //   this.rateLimitedCheckEmailInUse();
    // },
  },
  computed: {
    // getForgotCodeDisabled(): boolean {
    //   return this.getForgotCodeBlocked || !this.emailValid;
    // },
    // showSignupInfo(this: { current: string }): boolean {
    //   return this.current === 'signupInfo';
    // },
    // showAccountCreation(this: { current: string }): boolean {
    //   return this.current === 'accountCreation';
    // },
    // loginDisabled(): boolean {
    //   if (this.waitingOnCall) {
    //     return true;
    //   }
    //   if (!this.emailValid) {
    //     return true;
    //   }
    //   if (!this.passwordValid) {
    //     return true;
    //   }
    //   if (!this.loginStatus.inUse && this.modeSignin) {
    //     return true;
    //   }
    //   if (this.loginStatus.inUse && this.modeSignup) {
    //     return true;
    //   }
    //   return false;
    // },
    // googleEnabled(): boolean {
    //   return this.loginStatus.allowGoogleLogin && this.modeSignin;
    // },
    // waitingOnCall(): boolean {
    //   return this.pendingCallCount > 0;
    // },
    // showEmailNotFound(): boolean {
    //   return !this.waitingOnCall && !this.inEmail && this.modeSignin && !this.loginStatus.inUse;
    // },
    // showEmailAlreadyInUse(): boolean {
    //   return !this.waitingOnCall && !this.inEmail && this.modeSignup && this.loginStatus.inUse;
    // },
    // showCodeInvalid(): boolean {
    //   return !this.waitingOnCall && this.modeSignup && !this.inCode && this.codeInvalid;
    // },
    // showUnknownError(): boolean {
    //   return !this.waitingOnCall && this.modeSignup && !this.inCode && this.unknownError;
    // },
    // notificationType(): string {
    //   return 'is-success';
    // },
    // notificationMessage(): string {
    //   return 'tbd';
    // },
  },
});

</script>
<style lang="scss" scoped>

// hacked together transition, don't copy this.
.step {
  backface-visibility: hidden;
  z-index: 1;
  min-width: 256px;
  max-width: 768px;
}

</style>
