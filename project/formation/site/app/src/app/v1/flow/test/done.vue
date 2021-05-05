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
import wfWorkflow from "vue_workflow/dist/wf/wf_step.vue";
import {wfType} from "vue_workflow";

export default defineComponent({
  components: {wfWorkflow},
  props: {wf: {type: Object, required: true}},
  setup({wf}: { wf: wfType }) {
    return {};
  },
});

</script>

<style scoped>

</style>