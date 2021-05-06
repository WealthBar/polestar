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
          <v-col cols="12">
            <v-text-field
              validate-on-blur
              v-model="code"
              :rules="[rules.required]"
              type="number"
              label="Code"
            >
              <v-btn type="button" slot="prepend" @click.prevent="sendCode" :loading="codeLoading">Send</v-btn>
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
import {crClientResponse, crClientSetupInit} from 'ts_browser';
import {computed, defineComponent, ref, watch} from "@vue/composition-api";
import {wsSignup} from "@/app/ws_signup";
import {vFormType} from "@/app/vuetify.type";

export const deps = {window};

export default defineComponent({
  name: 'signup',
  setup() {
    const email = ref('');
    const password = ref('');
    const code = ref('');
    const codeLoading = ref(false);
    const valid = ref(false);
    const showPassword = ref(false);
    const loginFailed = ref(false);
    const authenticating = ref(false);
    const message = ref('');
    const emailRules = [
      (v: string) => !!v || 'required',
      (v: string) => /.+@.+\..+/.test(v) || 'invalid email',
      () => wsSignup.callsOutstanding.value > 0 || wsSignup.loginStatus.inUse || 'login already in use',
    ];

    watch(
      wsSignup.callsOutstanding,
      (v, ov) => {
        console.log('watch', v, ov);
        if (wsSignup.callsOutstanding.value > 0) {
          message.value = 'waiting...';
          return;
        }
        if (loginFailed.value) {
          message.value = 'Sign up failed';
          return;
        }
        message.value = '';
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
      valid.value = !!(form.value?.validate() && wsSignup.loginStatus?.inUse);
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

    function emailChange(e: unknown) {
      console.log('emailChange', e, email.value);
      loginFailed.value = false;
      wsSignup.updateLoginStatus({login: email.value});
    }

    function sendCode() {
      // todo
    }

    return {
      email,
      password,
      code,
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
      sendCode,
      codeLoading,
    };
  },
});

// export default Vue.extend({
//   name: 'signup',
  // data() {
  //   return {
  //     email: '',
  //     inEmail: true,
  //     password: '',
  //     inPassword: false,
  //     formValid: false,
  //     emailValid: false,
  //     passwordValid: false,
  //     loginFailed: false,
  //     code: '',
  //     inCode: false,
  //     codeValid: false,
  //     loading: false,
  //     unknownError: false,
  //     nb64: '',
  //     codeSent: false,
  //     locale: 'en',
  //   };
  // },
  // created() {
  //   ['email', 'code', 'password'].forEach((field) => {
  //     this.$watch(field, this.updateFormValid);
  //   });
  // },
  // methods: {
  //   async sendCode() {
  //     if (this.codeSent) {
  //       return;
  //     }
  //     const {error, nb64} = await this.$wsSignupSendVerification({login: this.email});
  //     if (error || !nb64) {
  //       this.unknownError = true;
  //       this.nb64 = '';
  //     } else {
  //       this.nb64 = nb64;
  //     }
  //     this.codeSent = true;
  //     // block sending again for 10s
  //     setTimeout(
  //         () => {
  //           this.codeSent = false;
  //         }, 10000,
  //     );
  //   },
  //   emailFocus() {
  //     this.loginFailed = false;
  //     this.inEmail = true;
  //   },
  //   passwordFocus() {
  //     this.inPassword = true;
  //     this.loginFailed = false;
  //   },
  //   emailBlur() {
  //     this.inEmail = false;
  //   },
  //   passwordBlur() {
  //     this.inPassword = false;
  //   },
  //   codeFocus() {
  //     this.inCode = true;
  //   },
  //   codeBlur() {
  //     this.inCode = false;
  //   },
  //   async submit() {
  //     if (!this.nb64) {
  //       this.unknownError = true;
  //       return;
  //     }
  //     this.unknownError = false;
  //     this.loading = true;
  //     await this.$wsSignupUpdateLoginStatusImmediate({login: this.email});
  //     if (!this.formValid) {
  //       return;
  //     }
  //     const {hpnb64} = crClientSetupInit(this.password, this.nb64);
  //     const r = await this.$wsSignupCreateAccount({
  //       login: this.email,
  //       code: this.code,
  //       nb64: this.nb64 || '',
  //       hpnb64,
  //     });
  //     if (r.error) {
  //       this.codeValid = false;
  //       this.loading = false;
  //     } else {
  //       const url = deps.window.location.toString().replace(/sign(up|in)\./, 'app.');
  //       deps.window.location.assign(url);
  //     }
  //   },
  //   updateFormValid() {
  //     this.emailValid = !!this.email.match(/[^@]+@[^@]+\.[^@.]+/);
  //     this.passwordValid = this.password.length >= 8;
  //     this.codeValid = this.code.length === 8;
  //     this.formValid = this.emailValid && this.passwordValid && this.codeValid && !this.$wsLoginStatus.inUse;
  //     this.$wsSignupUpdateLoginStatus({login: this.email});
  //   },
  // },
  // computed: {
  //   loginDisabled(): boolean {
  //     if (this.$wsOutstanding) {
  //       return true;
  //     }
  //     if (!this.formValid) {
  //       return true;
  //     }
  //     if (this.$wsLoginStatus.inUse) {
  //       return true;
  //     }
  //     return false;
  //   },
  //   disableSendCode(): boolean {
  //     return !(this.emailValid && this.passwordValid);
  //   },
  //   notificationTag(): string {
  //     if (this.$wsOutstanding) {
  //       return 'W_STANDBY';
  //     }
  //     if (this.inEmail) {
  //       return 'S_ENTER_EMAIL';
  //     }
  //     if (!this.emailValid) {
  //       return 'E_EMAIL_INVALID';
  //     }
  //     if (this.$wsLoginStatus.inUse) {
  //       return 'E_LOGIN_EXISTS';
  //     }
  //     if (this.inPassword) {
  //       return 'S_ENTER_PASSWORD_NEW';
  //     }
  //     if (!this.passwordValid) {
  //       return 'E_PASSWORD_INVALID';
  //     }
  //     if (this.inCode && !this.nb64) {
  //       return 'S_SEND_CODE';
  //     }
  //     if (this.nb64) {
  //       return 'S_ENTER_CODE_SENT';
  //     }
  //     if (!this.codeValid) {
  //       return 'E_CODE_INVALID';
  //     }
  //     if (this.loginFailed) {
  //       return 'E_LOGIN_FAILED';
  //     }
  //     return 'S_LOGIN';
  //   },
  //   notificationType(): string {
  //     return getMessageType(this.notificationTag);
  //   },
  //   notificationMessage(): string {
  //     return getMessage(this.locale, this.notificationTag, {email: this.email});
  //   },
  // },
// });

</script>
<style lang="scss" scoped>

</style>
