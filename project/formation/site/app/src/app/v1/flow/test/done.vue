<template>
  <wf-step
    :wf="wf"
  >
    <template slot="title">Test Done</template>
    <template slot="content">
      test
    </template>
  </wf-step>
</template>

<script lang="ts">
import "@/vue_comp";
import {defineComponent} from "@vue/composition-api";
import {wfType} from "vue_workflow";
import {wfStep} from "vue_workflow_components";

export default defineComponent({
  components: {wfStep},
  props: {wf: {type: Object, required: true}},
  setup({wf}: { wf: wfType }) {
    return {};
  },
});

</script>

<style scoped>

</style>