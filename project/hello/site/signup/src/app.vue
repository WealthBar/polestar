<template>
  <div
      id="app"
      class="container">
    <div class="columns is-centered is-vcentered" style="height: 100vh">
      <transition name="step">
        <div class="card column step" v-if="showSignupInfo" :disabled="!showSignupInfo">
          <div class="card-content">
            <h1 class="title is-1" v-if="mode==='signup'">Sign Up</h1>
            <h1 class="title is-1" v-if="mode==='signin'">Sign In</h1>
            <form ref="form_ep" @submit.prevent="onSubmit">
              <b-field
                  label="Email Address"
              >
                <b-input
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
                <div class="column"></div>
                <div class="column is-pulled-right is-narrow">
                  <b-button type="is-primary" native-type="submit" :disabled="!epValid" icon-right="arrow-right">Create
                    Account
                  </b-button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </transition>
      <transition name="step" appear>
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
      </transition>
    </div>
  </div>
</template>

<script lang="ts">

import Vue from 'vue';
import {wsCtor} from 'ts_browser';

const deps = {window};

const ws = wsCtor();

async function apiEmailInUse(email: string): Promise<boolean> {
  const r = (await ws.call('email_in_use', {email})) as { in_use?: boolean };
  return r?.in_use || false;
}

export default Vue.extend({
  name: 'app',
  data() {
    return {
      email: '',
      password: '',
      mode: 'signup',
      epValid: false,
      veValid: false,
      emailInUse: false,
      current: 'signupInfo',
      code: '',
      form: {},
    };
  },
  created() {
    const hostname = deps.window.location.hostname.toLowerCase();
    console.log('hostname', hostname);
    if (hostname.startsWith('signup.')) {
      this.mode = 'signup';
    } else if (hostname.startsWith('signin.')) {
      this.mode = 'signin';
    }

    ['email', 'password'].forEach((field) => {
      this.$watch(field, this.updateEpValid);
    });
    ['code'].forEach((field) => {
      this.$watch(field, this.updateVeValid);
    });
  },
  methods: {
    onSubmit() {
      this.current = 'accountCreation';
    },
    back() {
      this.current = 'signupInfo';
    },
    updateEpValid() {
      this.epValid = (this.$refs.form_ep as HTMLFormElement).checkValidity();
    },
    updateVeValid() {
      this.veValid = (this.$refs.form_ve as HTMLFormElement).checkValidity();
    },
  },
  computed: {
    showSignupInfo(this: { current: string }) {
      return this.current === 'signupInfo';
    },
    showAccountCreation(this: { current: string }) {
      return this.current === 'accountCreation';
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

.step-enter {
  transform: translateX(100%);
}

.step-enter-to {
  transform: translateX(0);
}

.step-enter-active {
  transition: all .25s ease-in-out;
  position: absolute;
  z-index: 1;
}

.step-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.step-leave {
  transform: translateX(0);
}

.step-leave-to {
  transform: translateX(-100%);
  opacity: 0;
  z-index: 0;
}

.step-leave-active {
  position: absolute;
  transition: all .25s ease-in-out;
  z-index: 0;
}

</style>
