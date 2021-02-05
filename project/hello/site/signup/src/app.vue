<template>
  <div
      id="app"
      class="page">
    <div class="columns is-centered is-vcentered" style="height: 100vh">
      <div class="card column" style="max-width: 512px">
        <div class="card-content">
          <h1 class="title is-1">Sign Up</h1>
          <form ref="form" @submit.prevent="onSubmit">
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
            <div class="columns is-centered">
              <b-button type="is-primary" native-type="submit" :disabled="!valid">Create Account</b-button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>
<script>

import Vue from "vue";

export default Vue.extend({
  name: 'app',
  data() {
    return {
      email: "",
      password: "",
      valid: false,
      form: {},
    };
  },
  created() {
    ['email','password'].forEach((field)=> {
      this.$watch(field, this.updateIsValid);
    });
  },
  methods: {
    onSubmit() {
      // todo
    },
    updateIsValid() {
      this.valid = this.$refs.form.checkValidity();
    }
  },
});

</script>
<style lang="scss" scoped>
</style>
