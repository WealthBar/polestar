<template>
  <div
      id="app"
      class="page">
    <div class="columns is-centered is-vcentered is-desktop is-mobile" style="height: 100vh">
      <div class="card column" style="max-width: 512px">
        <div class="card-content">
          <h1 class="title is-1">Sign Up</h1>
          <form @submit.prevent="onSubmit" novalidate>
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
                  placeholder="super secret password"
                  password-reveal
                  v-model="password"
              />
            </b-field>
            <br/>
            <div class="columns is-centered is-desktop is-mobile ">
              <b-button type="is-primary" native-type="submit">Create Account</b-button>
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
      invalid: true,
      form: {},
    };
  },
  methods: {
    async onSubmit() {
      const isValid = await this.$refs.observer.validate();
      if (!isValid) {
        console.log('invalid');
      }
    }
  },
});

</script>
<style lang="scss" scoped>
</style>
