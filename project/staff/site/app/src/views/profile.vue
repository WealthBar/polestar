<template>
  <div>
<pre>
  {{ $session | $json }}
</pre>
    <v-btn depressed color="primary">
      <a href="/api/logout" class="text--secondary">Logout</a>
    </v-btn>
  </div>
</template>
<script lang="ts">
  import Vue from 'vue';

  export const profile = Vue.extend({
    data() {
      return {};
    },
    computed: {},
    methods: {
    },
    props: {},
  });

  export default profile;

</script>
