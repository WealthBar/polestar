<template>
  <wf-container
    :wf="wf"
    :steps="steps"
  >
  </wf-container>
</template>

<script lang="ts">
import "@/vue_comp";
import {defineComponent} from "@vue/composition-api";
import {wfType} from "vue_workflow";
import init from "./test/init.vue";
import done from "./test/done.vue";
import {wfContainer} from "vue_workflow_components";

export default defineComponent({
  components: {
    wfContainer
  },
  props: {wf: {type: Object, required: true}},
  setup({wf}: { wf: wfType }) {
    const steps = {init, done};
    return {steps};
  },
});

</script>

<style scoped>

</style>