<template>
  <div id="app">
    <div v-if="loading">
      <v-overlay :value="true">
        <v-progress-circular
          indeterminate
          size="64"
        ></v-progress-circular>
      </v-overlay>
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

import {wsApp} from '@/app/ws';
import '@/vue_comp';
import {defineComponent} from "@vue/composition-api";

const deps = {window};

export default defineComponent({
  data() {
    return {
      loading: true,
      login: '',
    };
  },
  async created() {
    const r = await wsApp.whoAmI({});
    if (!r?.login) {
      // deps.window.location.assign(deps.window.location.protocol + '//' + deps.window.location.hostname.replace('app.', 'signin.'));
      console.log(r);
      this.loading = false;
      return;
    }
    this.login = r.login;
    this.loading = false;
  },
});
</script>
