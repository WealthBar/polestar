<template>
  <div>
    <form ref="form_ep" @submit.prevent="submit">
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
          <div class="column is-narrow ml-1" v-if="googleEnabled">
            <b-button @click="googleLogin" icon-pack="fab" icon-left="google"></b-button>
          </div>
        </div>
      </b-field>
      <b-field
          label="Password"
      >
        <div class="columns is-gapless is-mobile mb-0">
          <div class="column">
            <b-input
                type="password"
                name="password"
                minlength="8"
                placeholder="super secret password"
                password-reveal
                v-model="password"
                @focus="passwordFocus"
                @blur="passwordBlur"
            />
          </div>
        </div>
      </b-field>
      <div class="columns is-mobile">
        <div class="column p-0"></div>
        <div class="column is-pulled-right is-narrow">
          <b-button :loading="$wsOutstanding" type="is-primary" native-type="submit" :disabled="loginDisabled"
              icon-right="arrow-right">
            <span>Login</span>
          </b-button>
        </div>
      </div>
      <b-notification :closable="false" :type="notificationType">
        {{ notificationMessage }}
      </b-notification>
    </form>
  </div>
</template>

<script lang="ts">

import {crClientResponse} from 'ts_browser';
import {wsMixin} from '@/ws';
import mixins from 'vue-typed-mixins';
import {getMessage, getMessageType} from '@/app/messages';

export const deps = {window};

export default mixins(wsMixin).extend({
  name: 'signin',
  data() {
    return {
      email: '',
      inEmail: true,
      password: '',
      formValid: false,
      emailValid: false,
      passwordValid: false,
      inPassword: false,
      loginFailed: false,
      loading: false,
      unknownError: false,
      nb64: '',
      locale: 'en',
    };
  },
  created() {
    ['email', 'password'].forEach((field) => {
      this.$watch(field, this.updateFormValid);
    });
  },
  methods: {
    emailFocus() {
      this.loginFailed = false;
      this.inEmail = true;
    },
    passwordFocus() {
      this.loginFailed = false;
      this.inPassword = true;
    },
    emailBlur() {
      this.inEmail = false;
    },
    passwordBlur() {
      this.inPassword = false;
    },
    async submit() {
      this.loading = true;
      await this.$wsSignupUpdateLoginStatusImmediate({login: this.email});
      if (!this.formValid) {
        return;
      }
      const {nb64, r, salt, error} = await this.$wsSignupInitChallenge({login: this.email});
      if (nb64 && r && salt && !error) {
        const {fb64} = crClientResponse(r, nb64, salt, this.password);
        const {error} = await this.$wsSignupVerifyLogin({login: this.email, fb64});
        if (error) {
          this.loginFailed = true;
          this.loading = false;
        } else {
          const url = deps.window.location.toString().replace(/sign(up|in)\./, 'app.');
          deps.window.location.assign(url);
        }
      }
    },
    updateFormValid() {
      this.loginFailed = false;
      this.emailValid = !!this.email.match(/[^@]+@[^@]+\.[^@.]+/);
      this.passwordValid = this.password.length >= 8;
      this.formValid = this.emailValid && this.passwordValid && this.$wsLoginStatus.inUse;
      this.$wsSignupUpdateLoginStatus({login: this.email});
    },
    googleLogin() {
      // todo
    },
  },
  computed: {
    loginDisabled(): boolean {
      if (this.$wsOutstanding) {
        return true;
      }
      if (!this.formValid) {
        return true;
      }
      if (!this.$wsLoginStatus.inUse) {
        return true;
      }
      return false;
    },
    googleEnabled(): boolean {
      return this.$wsLoginStatus?.allowGoogleLogin || false;
    },
    notificationTag(): string {
      if (this.$wsOutstanding) {
        return 'W_STANDBY';
      }
      if (this.inEmail) {
        return 'S_ENTER_EMAIL';
      }
      if (!this.emailValid) {
        return 'E_EMAIL_INVALID';
      }
      if (!this.$wsLoginStatus.inUse) {
        return 'E_LOGIN_NOT_KNOWN';
      }
      if (this.inPassword) {
        return 'S_ENTER_PASSWORD_KNOWN';
      }
      if (!this.passwordValid) {
        return 'E_PASSWORD_INVALID';
      }
      if (this.loginFailed) {
        return 'E_LOGIN_FAILED';
      }
      return 'S_LOGIN';
    },
    notificationType(): string {
      return getMessageType(this.notificationTag);
    },
    notificationMessage(): string {
      return getMessage(this.locale, this.notificationTag);
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
