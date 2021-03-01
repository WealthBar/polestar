<template>
  <div
      id="app"
      class="container">
    <b-loading :is-full-page="true" v-model="loading" :can-cancel="false"></b-loading>
    <div class="columns is-centered is-vcentered m-1" style="height: 100vh">
      <div class="column" style="height: 32rem">
        <div class="columns is-centered">
          <div class="card column">
            <div class="card-content" style="padding: .5rem">
              <b-tabs v-model="activeTab" multiline type="is-toggle" expanded>
                <b-tab-item value="signin" label="Sign In">
                  <signin></signin>
                </b-tab-item>
                <b-tab-item value="signup" label="Sign Up">
                  <signup></signup>
                </b-tab-item>
                <b-tab-item value="forget_password" label="Forgot Password">
                  <forgot-password></forgot-password>
                </b-tab-item>
              </b-tabs>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">

import {wsMixin} from '@/ws';
import mixins from 'vue-typed-mixins';
import {signin, signup, forgotPassword} from '@/app/index';

export default mixins(wsMixin).extend({
  components: {signin, signup, forgotPassword},
  name: 'app',
  data() {
    return {
      loading: false,
      activeTab: 'signin',
    };
  },
  async created() {
    if (window.location.toString().includes('signup')) {
      this.activeTab = 'signup';
    }
  },
});

</script>
<style lang="scss" scoped>

.card {
  backface-visibility: hidden;
  z-index: 1;
  min-width: 256px;
  max-width: 600px;
}

.tab-item {
  margin-top: 1rem;
}

</style>
