<template>
  <div
      id="app"
      class="container">
    <b-loading :is-full-page="true" v-model="loading" :can-cancel="false"></b-loading>
    <div class="columns is-centered mx-4" style="margin-top: 5vh">
      <div class="card column step" v-if="showSignupInfo" :disabled="!showSignupInfo">
        <div class="card-content" style="padding: .5rem">
          <div class="columns is-gapless is-mobile is-vcentered">
            <div class="column">
              <h1 class="title is-1" v-if="modeSignup">Sign Up</h1>
              <h1 class="title is-1" v-if="modeSignin">Sign In</h1>
            </div>
            <div class="column is-narrow is-pulled-right  is-vcentered">
              <b-button v-if="modeSignup" size="is-small" icon-left="arrow-right" @click="switchModeToSignin"
                  style="min-width: 6rem">Sign In
              </b-button>
              <b-button v-if="modeSignin" size="is-small" icon-left="arrow-right" @click="switchModeToSignup"
                  style="min-width: 6rem">Sign Up
              </b-button>
            </div>
          </div>
          <form ref="form_ep" @submit.prevent="submitLogin">
            <b-field
                label="Email Address"
            >
              <div class="columns is-gapless is-mobile mb-0">
                <div class="column">
                  <b-input ref="email"
                      type="email"
                      name="email"
                      placeholder="alice@example.com"
                      v-model="email"
                      @focus="emailFocus"
                      @blur="emailBlur"
                  />
                </div>
                <div class="column is-narrow ml-1">
                  <b-button v-if="googleEnabled" @click="googleLogin" icon-pack="fab" icon-left="google"></b-button>
                </div>
              </div>
            </b-field>
            <b-field
                label="Password"
            >
              <b-input
                  type="password"
                  name="password"
                  minlength="8"
                  placeholder="super secret password"
                  password-reveal
                  v-model="password"
              />
            </b-field>
            <br/>
            <div class="columns is-mobile">
              <div class="column is-narrow" v-if="modeSignin">
                <b-button :disabled="loginDisabled" icon-left="question" @click="forgotPassword">Forgot Password
                </b-button>
              </div>
              <div class="column p-0"></div>
              <div class="column is-pulled-right is-narrow">
                <b-button type="is-primary" native-type="submit" :disabled="loginDisabled" icon-right="arrow-right">
                  <span v-if="modeSignup">Create Account</span>
                  <span v-if="modeSignin">Login</span>
                </b-button>
              </div>
            </div>
            <b-notification v-if="showEmailNotFound" :closable="false" type="is-danger is-light">
              Email not found.
            </b-notification>
            <b-notification v-if="showEmailAlreadyInUse" :closable="false" type="is-danger is-light">
              Email already in use.
            </b-notification>
          </form>
        </div>
      </div>
      <div class="card column step" v-if="showAccountCreation"
          :disabled="!showAccountCreation">
        <div class="card-content">
          <h1 class="title is-1">Verify Email</h1>
          <h3 class="subtitle is-3">{{ email }}</h3>
          <form ref="form_ve" @submit.prevent="submitCode">
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
            <br/>
            <div class="columns">
              <div class="column is-narrow">
                <b-button @click="back" icon-left="arrow-left">Back</b-button>
              </div>
              <div class="column is-narrow">
                <b-button>Resend Code</b-button>
              </div>
              <div class="column"></div>
              <div class="column is-narrow is-pulled-right">
                <b-button type="is-primary" native-type="submit" :disabled="!veValid" icon-right="arrow-right">
                  Verify
                </b-button>
              </div>
            </div>
            <b-notification v-if="showCodeInvalid" :closable="false" type="is-danger is-light">
              Code Invalid.
            </b-notification>
            <b-notification v-if="showUnknownError" :closable="false" type="is-danger">
              Something went wrong. Please try again later.
            </b-notification>
          </form>
        </div>
      </div>
    </div>
  </div>

</template>

<script lang="ts">

import Vue from 'vue';
import {crClientSetupInit, rateLimit, wsCtor} from 'ts_browser';

const deps = {window};

function apiHostName(): string {
  const m = deps.window.location.hostname.toLowerCase().match(/(?<domain>[^.]+\.[^.]+$)/);
  return 'api.' + m?.groups?.domain;
}

const ws = wsCtor(apiHostName());

async function apiEmailStatus(email: string): Promise<{ inUse: boolean; allowGoogleLogin: boolean }> {
  try {
    const rawReply = await ws.call('signup/emailStatus', {email});
    const reply = rawReply as { inUse: boolean; allowGoogleLogin: boolean };
    if (!reply) {
      return {inUse: false, allowGoogleLogin: false};
    }
    return reply;
  } catch (e) {
    console.error(e);
    return {inUse: false, allowGoogleLogin: false};
  }
}

async function apiEmailSendVerification(email: string): Promise<{ error?: string; nb64?: string }> {
  const rawReply = await ws.call('signup/emailSendVerification', {email});
  const reply = rawReply as { error?: string; nb64?: string };
  if (!reply) {
    return {error: 'NO_REPLY'};
  }
  return reply;
}

async function apiCreateAccount(email: string, code: string, nb64: string, hpnb64: string): Promise<{ error?: string }> {
  const rawReply = await ws.call('signup/emailCreateAccount', {email, code, nb64, hpnb64});
  const reply = rawReply as { error?: string };
  if (!reply) {
    return {error: 'NO_REPLY'};
  }
  return reply;
}

const mSignup = 'signup';
const mSignin = 'signin';

export default Vue.extend({
  name: 'app',
  data() {
    return {
      email: '',
      inEmail: true,
      password: '',
      mode: 'signup',
      epValid: false,
      veValid: false,
      emailValid: false,
      passwordValid: false,
      emailStatus: {inUse: false, allowGoogleLogin: false, checking: false, email: ''},
      current: 'signupInfo',
      code: '',
      inCode: false,
      codeInvalid: false,
      loading: false,
      unknownError: false,
      nb64: '' as string | undefined,
    };
  },
  created() {
    const hostname = deps.window.location.hostname.toLowerCase();
    if (hostname.startsWith('signup.')) {
      this.mode = 'signup';
    } else if (hostname.startsWith('signin.')) {
      this.mode = 'signin';
    }
    this.rateLimitedCheckEmailInUse = rateLimit(500, this.checkEmailInUse);
    ['email', 'password'].forEach((field) => {
      this.$watch(field, this.updateEpValid);
    });
    ['code'].forEach((field) => {
      this.$watch(field, this.updateVeValid);
    });
  },
  methods: {
    async checkEmailInUse() {
      if (this.emailStatus.email === this.email) {
        return;
      }
      this.emailStatus.checking = true;
      const email = this.email;
      const r = await apiEmailStatus(email);
      if (this.email === email) {
        this.emailStatus.email = email;
        this.emailStatus.inUse = r.inUse;
        this.emailStatus.allowGoogleLogin = r.allowGoogleLogin;
      }
      this.emailStatus.checking = false;
    },
    emailFocus() {
      this.inEmail = true;
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
    rateLimitedCheckEmailInUse() {
      // replaced in create
    },
    async submitLogin() {
      await this.checkEmailInUse();
      this.loading = true;
      if (this.modeSignup) {
        this.current = 'accountCreation';
        const {nb64} = await apiEmailSendVerification(this.email);
        this.nb64 = nb64;
        this.loading = false;
      }
    },
    async submitCode() {
      if (!this.nb64) {
        this.unknownError = true;
        return;
      }
      this.unknownError = false;
      this.loading = true;
      const {hpnb64} = crClientSetupInit(this.password, this.nb64);
      const r = await apiCreateAccount(this.email, this.code, this.nb64, hpnb64);
      if (r.error) {
        this.codeInvalid = true;
      } else {
        console.log('redirect', deps.window.location.toString().replace(this.mode, 'app'));
      }
    },
    back() {
      this.current = 'signupInfo';
    },
    updateEpValid() {
      this.emailValid = !!this.email.match(/[^@]+@[^@]+\.[^@.]+/);
      this.passwordValid = this.password.length >= 8;
      this.epValid = this.emailValid && this.passwordValid;
      if (this.emailValid) {
        this.rateLimitedCheckEmailInUse();
      }
    },
    updateVeValid() {
      this.veValid = this.code.length === 8;
    },
    async forgotPassword() {
      this.loading = true;
      await this.checkEmailInUse();
    },
    googleLogin() {
      // todo
    },
    switchModeToSignin() {
      this.mode = 'signin';
      this.rateLimitedCheckEmailInUse();
    },
    switchModeToSignup() {
      this.mode = 'signup';
      this.rateLimitedCheckEmailInUse();
    },
  },
  computed: {
    showSignupInfo(this: { current: string }): boolean {
      return this.current === 'signupInfo';
    },
    showAccountCreation(this: { current: string }): boolean {
      return this.current === 'accountCreation';
    },
    modeSignup(): boolean {
      return this.mode === mSignup;
    },
    modeSignin(): boolean {
      return this.mode === mSignin;
    },
    loginDisabled(): boolean {
      if (this.emailStatus.checking) {
        return true;
      }
      if (!this.emailValid) {
        return true;
      }
      if (!this.passwordValid) {
        return true;
      }
      if (!this.emailStatus.inUse && this.modeSignin) {
        return true;
      }
      if (this.emailStatus.inUse && this.modeSignup) {
        return true;
      }
      return false;
    },
    googleEnabled(): boolean {
      return this.emailStatus.allowGoogleLogin && this.modeSignin;
    },
    showEmailNotFound(): boolean {
      return !this.inEmail && this.modeSignin && !this.emailStatus.inUse;
    },
    showEmailAlreadyInUse(): boolean {
      return !this.inEmail && this.modeSignup && this.emailStatus.inUse;
    },
    showCodeInvalid(): boolean {
      return this.modeSignup && !this.inCode && this.codeInvalid;
    },
    showUnknownError(): boolean {
      return this.modeSignup && !this.inCode && this.unknownError;
    },
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
