<template>
  <div id="app">
    <div id="nav">
      <router-link to="/">Home</router-link>
      |
      <router-link to="/about">About</router-link>
    </div>
    <router-view/>
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

import {wsStaffMixin} from '@/app/ws_staff_mixin';
import mixins from 'vue-typed-mixins';

const deps = {window};

export default mixins(wsStaffMixin).extend({
  data() {
    return {login: ''};
  },
  async created() {
    const r = await this.$wsWhoAmI();
    if (!r?.login) {
      deps.window.location.assign(deps.window.location.protocol + '//' + deps.window.location.hostname.replace('app.', 'api.') + '/gauth/init');
      return;
    }
    this.login = r.login;
  },
});
</script>
