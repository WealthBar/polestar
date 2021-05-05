<template>
  <wf-step
    :wf="wf"
    :commit="commit"
  >
    <template slot="title">Test Init</template>
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
    const commit = () => "done";
    return {commit};
  },
});

</script>

<style scoped>

</style>