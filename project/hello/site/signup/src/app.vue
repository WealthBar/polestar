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
            >
              <b-input ref="email"
                  type="email"
                  name="email"
                  placeholder="alice@example.com"
                  v-model="email"
              />
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
              <div class="column" v-if="modeSignin">
                <b-button :disabled="!emailValid" icon-left="question" @click="forgotPassword">Forgot Password
                </b-button>
              </div>
              <div class="column"></div>
              <div class="column is-pulled-right is-narrow">
                <b-button type="is-primary" native-type="submit" :disabled="!epValid" icon-right="arrow-right">
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

async function apiEmailInUse(email: string): Promise<boolean> {
  try {
    const reply = (await ws.call('emailInUse', {email})) as {in_use: boolean};
    return reply.in_use || false;
  } catch (e) {
    console.error(e);
    return false;
  }
}

const mSignup = 'signup';
const mSignin = 'signin';

export default Vue.extend({
  name: 'app',
  data() {
    return {
      email: '',
      password: '',
      mode: 'signup',
      epValid: false,
      veValid: false,
      emailValid: false,
      emailInUse: false,
      emailInUseChecking: '',
      emailInUseLastCheck: 0,
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
      this.emailInUse = await apiEmailInUse(this.email);
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
      this.epValid = (this.$refs.form_ep as HTMLFormElement).checkValidity();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.emailValid = (this.$refs.email as any).checkHtml5Validity();
      if (this.emailValid) {
        this.rateLimitedCheckEmailInUse();
      }
    },
    updateVeValid() {
      this.veValid = (this.$refs.form_ve as HTMLFormElement).checkValidity();
    },
    async forgotPassword() {
      this.loading = true;
      await this.checkEmailInUse();
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
