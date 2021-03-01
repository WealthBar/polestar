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
          label="Password"
      >
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
            :disabled="disableSendCode"
        />
      </b-field>
      <div class="columns is-mobile">
        <div class="column is-narrow ml-1">
          <b-button type="is-primary is-light" @click="sendCode" :disabled="disableSendCode">
            Send Code
          </b-button>
        </div>
        <div class="column p-0"></div>
        <div class="column is-pulled-right is-narrow">
          <b-button :disabled="loginDisabled" :loading="$wsOutstanding" type="is-primary" native-type="submit"
              icon-right="arrow-right">
            Sign Up
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

import {wsMixin} from '@/ws';
import mixins from 'vue-typed-mixins';
import {crClientSetupInit} from 'ts_browser';
import {getMessage, getMessageType} from '@/app/messages';

export const deps = {window};

export default mixins(wsMixin).extend({
  name: 'signup',
  data() {
    return {
      email: '',
      inEmail: true,
      password: '',
      inPassword: false,
      formValid: false,
      emailValid: false,
      passwordValid: false,
      loginFailed: false,
      code: '',
      inCode: false,
      codeInvalid: false,
      loading: false,
      unknownError: false,
      nb64: '',
      codeSent: false,
      locale: 'en',
    };
  },
  created() {
    ['email', 'code', 'password'].forEach((field) => {
      this.$watch(field, this.updateFormValid);
    });
  },
  methods: {
    async sendCode() {
      if (this.codeSent) {
        return;
      }
      const {error, nb64} = await this.$wsSendVerification({login: this.email});
      if (error || !nb64) {
        this.unknownError = true;
        this.nb64 = '';
      } else {
        this.nb64 = nb64;
      }
      this.codeSent = true;
      // block sending again for 10s
      setTimeout(
          () => {
            this.codeSent = false;
          }, 10000,
      );
    },
    emailFocus() {
      this.loginFailed = false;
      this.inEmail = true;
    },
    passwordFocus() {
      this.inPassword = true;
      this.loginFailed = false;
    },
    emailBlur() {
      this.inEmail = false;
    },
    passwordBlur() {
      this.inPassword = false;
    },
    codeFocus() {
      this.inCode = true;
    },
    codeBlur() {
      this.inCode = false;
    },
    async submit() {
      if (!this.nb64) {
        this.unknownError = true;
        return;
      }
      this.unknownError = false;
      this.loading = true;
      await this.$wsUpdateLoginStatusImmediate({login: this.email});
      if (!this.formValid) {
        return;
      }
      const {hpnb64} = crClientSetupInit(this.password, this.nb64);
      const r = await this.$wsCreateAccount({
        login: this.email,
        code: this.code,
        nb64: this.nb64 || '',
        hpnb64,
      });
      if (r.error) {
        this.codeInvalid = true;
        this.loading = false;
      } else {
        const url = deps.window.location.toString().replace(/sign(up|in)\./, 'app.');
        deps.window.location.assign(url);
      }
    },
    updateFormValid() {
      this.emailValid = !!this.email.match(/[^@]+@[^@]+\.[^@.]+/);
      this.passwordValid = this.password.length >= 8;
      this.formValid = this.code.length === 8;
      this.$wsUpdateLoginStatus({login: this.email});
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
      if (this.$wsLoginStatus.inUse) {
        return true;
      }
      return false;
    },
    disableSendCode(): boolean {
      return !(this.emailValid && this.passwordValid);
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
      if (this.$wsLoginStatus.inUse) {
        return 'E_LOGIN_EXISTS';
      }
      if (this.inPassword) {
        return 'S_ENTER_PASSWORD_NEW';
      }
      if (!this.passwordValid) {
        return 'E_PASSWORD_INVALID';
      }
      if (this.inCode && !this.nb64) {
        return 'S_SEND_CODE';
      }
      if (this.nb64) {
        return 'S_ENTER_CODE_SENT';
      }
      if (this.codeInvalid) {
        return 'E_CODE_INVALID';
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
      return getMessage(this.locale, this.notificationTag, {email: this.email});
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
