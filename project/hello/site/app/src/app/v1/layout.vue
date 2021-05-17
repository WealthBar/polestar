<template>
  <v-app class="pa-6">
    <a-header/>
    <a-sidebar/>
    <v-main class="content">
      <router-view/>
      <a-footer/>
    </v-main>
  </v-app>
</template>

<script>
import header from '@/app/v1/header.vue';
import sidebar from '@/app/v1/sidebar.vue';
import footer from "@/app/v1/footer.vue";

export default {
  name: 'layout',
  components: {
    'a-footer': footer,
    'a-header': header,
    'a-sidebar': sidebar,
  },
};
</script>

<style lang="scss" scoped>

</style>
