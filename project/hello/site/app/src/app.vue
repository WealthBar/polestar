<template>
  <div id="app">
    <div v-if="loading">
      <b-loading is-full-page :active="loading"></b-loading>
    </div>
    <div v-else>
      <div id="nav">
        <router-link to="/">Home</router-link>
        |
        <router-link to="/about">About</router-link>
      </div>
      <router-view/>
    </div>
  </div>
</template>

<style lang="scss">
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}

#nav {
  padding: 30px;

  a {
    font-weight: bold;
    color: #2c3e50;

    &.router-link-exact-active {
      color: #42b983;
    }
  }
}
</style>

<script lang="ts">

import mixins from 'vue-typed-mixins';
import {wsAppMixin} from '@/app/ws_app_mixin';

const deps = {window};

export default mixins(wsAppMixin).extend({
  data() {
    return {
      loading: true,
      login: '',
    };
  },
  async created() {
    const r = await this.$wsWhoAmI();
    if (!r?.login) {
      deps.window.location.assign(deps.window.location.protocol + '//' + deps.window.location.hostname.replace('app.', 'signin.'));
      return;
    }
    this.login = r.login;
    this.loading = false;
  },
});
</script>
