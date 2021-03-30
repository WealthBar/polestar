<template>
  <v-card class="px-4">
    <v-card-text>
      <v-form ref="form" v-model="valid" lazy-validation>
        <v-row>
          <v-col cols="12">
            <v-text-field
                validate-on-blur
                v-model="email"
                :rules="emailRules"
                label="Email"
                required
                autocomplete="email"
                @keyup="emailChange"
            ></v-text-field>
          </v-col>
          <v-col cols="12">
            <v-text-field
                validate-on-blur
                v-model="password"
                :rules="[rules.required, rules.min]"
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
import {vFormType} from '@/app/vuetify.type';
import {computed, defineComponent, ref, watch} from '@vue/composition-api';
import {wsSignup} from '@/app/ws_signup';

export const deps = {window};

export default defineComponent({
  name: 'signin',
  setup() {
    const email = ref('');
    const password = ref('');
    const valid = ref(false);
    const showPassword = ref(false);
    const loginFailed = ref(false);
    const authenticating = ref(false);
    const message = ref('');
    const emailRules = [
      (v: string) => !!v || 'required',
      (v: string) => /.+@.+\..+/.test(v) || 'invalid email',
      () => wsSignup.state.callsOutstanding > 0 || wsSignup.state?.loginStatus?.inUse || 'login not found',
    ];

    watch(
        wsSignup.state,
        (v, ov) => {
          console.log('watch', v, ov);
          if (wsSignup.state.callsOutstanding) {
            message.value = 'waiting...';
            return;
          }
          if (loginFailed.value) {
            message.value = 'Login Failed';
            return;
          }
          message.value = 'a';
        },
        {deep: true},
    );

    const rules = {
      required: (v: string) => !!v || 'required',
      min: (v: string) => (v && v.length >= 8) || '8 characters required',
    };

    const form = ref<vFormType>(undefined);

    function updateFormValid() {
      loginFailed.value = false;
      valid.value = !!(form.value?.validate() && wsSignup.state?.loginStatus?.inUse);
      wsSignup.updateLoginStatus({login: email.value});
    }

    async function submit() {
      authenticating.value = true;
      try {
        await wsSignup.updateLoginStatusImmediate({login: email.value});
        updateFormValid();
        if (!valid) {
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
          message.value = 'Login Failed';
        }
      } finally {
        authenticating.value = false;
      }
    }

    async function validate() {
      updateFormValid();
      if (valid) {
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

    function emailChange(e: any) {
      console.log('emailChange', e, email.value);
      loginFailed.value = false;
      wsSignup.updateLoginStatus({login: email.value});
    }

    return {
      email,
      password,
      valid,
      showPassword,
      loginFailed,
      authenticating,
      rules,
      emailRules,
      validate,
      appendIcon,
      toggleShowPassword,
      passwordInputType,
      message,
      nop,
      emailChange,
    };
  },
});
</script>

<style lang="scss" scoped>
</style>
