<template>
  <div class="home">
    <img alt="Vue logo" src="../assets/logo.png">
    <hello-world msg="Welcome to Your Vue.js + TypeScript App"/>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { helloWorld } from '@/components'; // @ is an alias to /src

export default Vue.extend({
  name: 'Home',
  components: {
    helloWorld,
  },
});
</script>
