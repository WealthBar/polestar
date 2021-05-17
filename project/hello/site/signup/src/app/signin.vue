<template>
  <v-card class="px-4">
    <v-card-text>
      <v-form lazy-validation>
        <v-row>
          <v-col cols="12">
            <v-text-field
              validate-on-blur
              v-model="email"
              :rules="emailRules"
              label="Email"
              required
              autocomplete="email"
            ></v-text-field>
          </v-col>
          <v-col cols="12">
            <v-text-field
              validate-on-blur
              v-model="password"
              :rules="passwordRules"
              :type="passwordInputType"
              label="Password"
              hint="At least 8 characters"
              autocomplete="password"
            >
              <button type="button" @click.prevent="toggleShowPassword" slot="append">
                <font-awesome-icon :icon="appendIcon()"></font-awesome-icon>
              </button>
            </v-text-field>
          </v-col>
          <v-col class="d-flex" cols="12" sm="6" xsm="12">
            {{ message }}
          </v-col>
          <v-spacer></v-spacer>
          <v-col class="d-flex" cols="12" sm="3" xsm="12" align-end>
            <v-btn
              x-large
              block
              :disabled="!valid"
              color="success"
              @click.prevent="validate"
              :loading="authenticating"
            >
              Sign In
            </v-btn>
          </v-col>
        </v-row>
      </v-form>
    </v-card-text>
  </v-card>
</template>

<script lang="ts">
import '@/vue_comp';
import {crClientResponse} from 'ts_browser';
import {computed, defineComponent, ref, watch} from '@vue/composition-api';
import {wsSignup} from '@/app/ws_signup';

export const deps = {window};

export default defineComponent({
  name: 'signin',
  setup() {
    const email = ref('');
    const password = ref('');
    const showPassword = ref(false);
    const loginFailed = ref(false);
    const authenticating = ref(false);
    const message = ref('');
    const emailRules = [
      (v: string) => !!v || 'required',
      (v: string) => /.+@.+\..+/.test(v) || 'invalid email',
      () => wsSignup.callsOutstanding.value > 0 || wsSignup.loginStatus?.inUse || 'login not found',
    ];

    watch(
      wsSignup.callsOutstanding,
      (v, ov) => {
        if (wsSignup.callsOutstanding.value > 0) {
          message.value = 'waiting...';
          return;
        }
        if (loginFailed.value) {
          message.value = 'Login Failed';
          return;
        }
        message.value = '';
      },
      {deep: true},
    );

    const passwordRules = [
      (v: string) => !!v || 'required',
      (v: string) => (v && v.length >= 8) || '8 characters required',
    ];

    function isValid(): boolean {
      loginFailed.value = false;
      wsSignup.updateLoginStatus({login: email.value});

      return !!email.value
        && !!password.value
        && passwordRules.every(r => r(password.value) === true)
        && emailRules.every(r => r(email.value) === true)
        && wsSignup.loginStatus?.inUse;
    }

    const valid = computed(isValid);

    async function submit() {
      authenticating.value = true;
      try {
        await wsSignup.updateLoginStatusImmediate({login: email.value});
        if (!isValid()) {
          return;
        }
        const {nb64, r, salt, error} = await wsSignup.initChallenge({login: email.value});
        if (nb64 && r && salt && !error) {
          const {fb64} = crClientResponse(r, nb64, salt, password.value);
          const {error} = await wsSignup.verifyLogin({login: email.value, fb64});
          if (error) {
            console.log('error');
            loginFailed.value = true;
          } else {
            const url = deps.window.location.toString().replace(/sign(up|in)\./, 'app.');
            deps.window.location.assign(url);
          }
        } else {
          message.value = 'Sing in failed';
        }
      } finally {
        authenticating.value = false;
      }
    }

    async function validate() {
      if (isValid()) {
        await submit();
      }
    }

    function toggleShowPassword() {
      showPassword.value = !showPassword.value;
    }

    const passwordInputType = computed(() => showPassword.value ? 'text' : 'password');

    function appendIcon() {
      return (
        showPassword.value ?
          ['far', 'eye-slash'] :
          ['far', 'eye']
      );
    }

    function nop(e: unknown) {
      console.log('nop', e);
    }


    validate();

    return {
      email,
      password,
      valid,
      showPassword,
      loginFailed,
      authenticating,
      passwordRules,
      emailRules,
      validate,
      appendIcon,
      toggleShowPassword,
      passwordInputType,
      message,
      nop,
      updateValid: isValid,
    };
  },
});
</script>

<style lang="scss" scoped>
</style>
