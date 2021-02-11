<template>
  <div
      id="app"
      class="container">
    <b-loading :is-full-page="true" v-model="loading" :can-cancel="false"></b-loading>
    <div class="columns is-centered is-vcentered" style="height: 100vh">
      <div class="card column step" v-if="showSignupInfo" :disabled="!showSignupInfo">
        <div class="card-content">
          <h1 class="title is-1" v-if="modeSignup">Sign Up</h1>
          <h1 class="title is-1" v-if="modeSignin">Sign In</h1>
          <form ref="form_ep" @submit.prevent="onSubmit">
            <b-field
                label="Email Address"
                :message="emailMessage"
                :type="emailType"
            >
              <div class="columns is-gapless">
                <div class="column">
                  <b-input ref="email"
                      type="email"
                      name="email"
                      placeholder="alice@example.com"
                      v-model="email"
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
            <div class="columns">
              <div class="column is-narrow is-pulled-left" v-if="modeSignin">
                <b-button :disabled="loginDisabled" icon-left="question" @click="forgotPassword">Forgot Password
                </b-button>
              </div>
              <div class="column"></div>
              <div class="column is-pulled-right is-narrow">
                <b-button type="is-primary" native-type="submit" :disabled="loginDisabled" icon-right="arrow-right">
                  <span v-if="modeSignup">Create Account</span>
                  <span v-if="modeSignin">Login</span>
                </b-button>
              </div>
            </div>
          </form>
        </div>
      </div>
      <div class="card column step" v-if="showAccountCreation"
          :disabled="!showAccountCreation">
        <div class="card-content">
          <h1 class="title is-1">Verify Email</h1>
          <h3 class="subtitle is-3">{{ email }}</h3>
          <form ref="form_ve" @submit.prevent="onSubmit">
            <b-field
                label="Code"
            >
              <b-input
                  type="text"
                  minlength="8"
                  name="code"
                  placeholder=""
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
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">

import Vue from 'vue';
import {rateLimit, wsCtor} from 'ts_browser';

const deps = {window};

function apiHostName(): string {
  const m = deps.window.location.hostname.toLowerCase().match(/(?<domain>[^.]+\.[^.]+$)/);
  return 'api.' + m?.groups?.domain;
}

const ws = wsCtor(apiHostName());

async function apiEmailStatus(email: string): Promise<{ inUse: boolean; allowGoogleLogin: boolean }> {
  try {
    const rawReply = await ws.call('emailStatus', {email});
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

async function apiEmailSendVerification(email: string): Promise<{ error?: string }> {
  const rawReply = await ws.call('emailSendVerification', {email});
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
      emailMessage: '',
      emailType: '',
      password: '',
      mode: 'signup',
      epValid: false,
      veValid: false,
      emailValid: false,
      passwordValid: false,
      emailStatus: {inUse: false, allowGoogleLogin: false, checking: false},
      current: 'signupInfo',
      code: '',
      loading: false,
      form: {},
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
      this.emailStatus.checking = true;
      const r = await apiEmailStatus(this.email);
      this.emailStatus.inUse = r.inUse;
      this.emailStatus.allowGoogleLogin = r.allowGoogleLogin;

      if (this.modeSignup && this.emailStatus.inUse) {
        this.emailMessage = 'Email already in use';
        this.emailType = 'is-danger';
      } else {
        this.emailMessage = '';
        this.emailType = 'is-success';
      }
      this.emailStatus.checking = false;
    },
    rateLimitedCheckEmailInUse() {
      // replaced in create
    },
    async onSubmit() {
      await this.checkEmailInUse();
      this.loading = true;
      if (this.modeSignup) {
        this.current = 'accountCreation';
        this.loading = false;
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
      this.veValid = this.code.length == 8;
    },
    async forgotPassword() {
      this.loading = true;
      await this.checkEmailInUse();
    },
    googleLogin() {
      // todo
    },
  },
  computed: {
    showSignupInfo(this: { current: string }) {
      return this.current === 'signupInfo';
    },
    showAccountCreation(this: { current: string }) {
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

  },
});

</script>
<style lang="scss" scoped>

// hacked together transition, don't copy this.
.step {
  backface-visibility: hidden;
  z-index: 1;
  min-width: 512px;
  max-width: 768px;
}

</style>
