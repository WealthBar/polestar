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
              ref="codeField"
              validate-on-blur
              v-model="code"
              :rules="[rules.required]"
              type="number"
              label="Code"
            >
            </v-text-field>
          </v-col>
          <v-col class="d-flex" cols="12">
            {{ message }}
          </v-col>
          <v-col class="d-flex" cols="12">
            <v-btn x-large color="success" type="button" @click.prevent="sendCode" :loading="codeLoading" v-if="!codeSent" :disabled="!canSendCode">Send Code</v-btn>
            <v-btn x-large color="warning" outlined type="button" @click.prevent="sendCode" :loading="codeLoading" v-if="codeSent">Resend Code</v-btn>
            <v-spacer></v-spacer>
            <v-btn v-if="codeSent"
                   x-large
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
import {crClientSetupInit} from 'ts_browser';
import {computed, defineComponent, ref, watch} from "@vue/composition-api";
import {wsSignup} from "@/app/ws_signup";

export const deps = {window};

export default defineComponent({
  name: 'forgot-password',
  setup() {
    const email = ref('');
    const password = ref('');
    const code = ref('');
    const codeSent = ref(false);
    const codeSentByServer = ref(false);
    const showPassword = ref(false);
    const authenticating = ref(false);
    const message = ref('');
    const emailRules = [
      (v: string) => !!v || 'required',
      (v: string) => /.+@.+\..+/.test(v) || 'invalid email',
      () => wsSignup.callsOutstanding.value === 0 || 'checking...',
      () => wsSignup.loginStatus.inUse || 'login not found',
    ];

    watch(
      wsSignup.callsOutstanding,
      (v, ov) => {
        console.log('watch', v, ov);
        if (wsSignup.callsOutstanding.value > 0) {
          message.value = 'waiting...';
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

    const resendAllowed = ref(true);

    const codeLoading = computed(() => {
        if (!codeSent.value) {
          return false;
        }
        return !resendAllowed.value || !codeSentByServer.value;
      }
    );
    const emailPasswordValid = computed(()=>{
      return !!email.value
        && !!password.value
        && password.value.length >= 8
        && emailRules.every(r => r(email.value) === true)
        && wsSignup.loginStatus?.inUse;
    });

    const canSendCode = computed(() => {
      return emailPasswordValid.value && !codeLoading.value;
    });

    function isValid():boolean {
      wsSignup.updateLoginStatus({login: email.value});
      return emailPasswordValid.value && code.value.length === 8;
    }

    const valid = computed(isValid);

    async function submit() {
      authenticating.value = true;
      if (!isValid()) {
        return;
      }

      await wsSignup.updateLoginStatusImmediate({login: email.value});
      if (!isValid()) {
        return;
      }

      const {hpnb64} = crClientSetupInit(password.value, nb64);
      const r = await wsSignup.changePassword({
        login: email.value,
        code: code.value,
        nb64: nb64,
        hpnb64,
      });

      if (r.error) {
        message.value = 'Code Invalid';
        authenticating.value = false;
      } else {
        const url = deps.window.location.toString().replace(/sign(up|in)\./, 'app.');
        deps.window.location.assign(url);
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

    let nb64 = '';

    const codeField = ref<HTMLInputElement|undefined>(undefined);
    async function sendCode() {
      if (!canSendCode.value) {
        return;
      }

      codeSent.value = true;
      codeSentByServer.value = false;
      resendAllowed.value = false;
      deps.window.setTimeout(() => {
        resendAllowed.value = true;
      }, 5000);

      const r = await wsSignup.forgotPassword({login: email.value});
      codeSentByServer.value = true;

      if (r.error || !r.nb64) {
        message.value = 'Failed to send code. Try again later.';
        nb64 = '';
      } else {
        nb64 = r.nb64;
      }
      codeField.value?.focus();
    }

    validate();

    return {
      email,
      password,
      code,
      codeSent,
      codeLoading,
      valid,
      showPassword,
      authenticating,
      rules,
      emailRules,
      validate,
      appendIcon,
      toggleShowPassword,
      passwordInputType,
      message,
      sendCode,
      canSendCode,
      codeField
    };
  },
});


//
// export default Vue.extend({
//   name: 'forgotPassword',
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
  //     const {error, nb64} = await this.$wsSignupForgotPassword({login: this.email});
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
  //     this.loading = false;
  //       return;
  //     }
  //
  //     const {hpnb64} = crClientSetupInit(this.password, this.nb64);
  //     const r = await this.$wsSignupChangePassword({
  //       login: this.email,
  //       code: this.code,
  //       nb64: this.nb64 || '',
  //       hpnb64,
  //     });
  //
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
  //     this.formValid = this.emailValid && this.passwordValid && this.codeValid && this.$wsLoginStatus.inUse;
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
  //     if (!this.$wsLoginStatus.inUse) {
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
  //     if (!this.$wsLoginStatus.inUse) {
  //       return 'E_LOGIN_NOT_KNOWN';
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
::v-deep input::-webkit-outer-spin-button,
::v-deep input::-webkit-inner-spin-button {
  -moz-appearance: textfield;
  -webkit-appearance: none;
  margin: 0;
}
</style>
