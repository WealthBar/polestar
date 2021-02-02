<template>
  <v-btn :to="to" depressed color="primary" :class="{'secondary--text': true, 'text--lighten-3': isActive}">
    <slot/>
  </v-btn>
</template>

<script lang="ts">
  import Vue from "vue";

  export default Vue.extend({
    props: {
      to: String,
    },
    computed: {
      isActive(): boolean {
        return this.$route.path.startsWith(this.to);
      },
    },
  });
</script>

<style lang="stylus" scoped>
</style>
