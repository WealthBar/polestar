<template>
  <div>
    <v-container :disabled="loading">
      <v-fade-transition hide-on-leave>
        <component
            v-if="activeStepComponent"
            :is="activeStepComponent"
            :key="$route.fullPath"
        ></component>
      </v-fade-transition>
    </v-container>
  </div>
</template>

<script lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any */

import '../vue_comp';
import {computed, defineComponent} from '@vue/composition-api';
import {wfType} from '@/wf';

export default defineComponent({
  name: 'wf-container',
  props: {
    wf: {type: Object, required: true},
    steps: {type: Object, required: true},
  },
  setup({wf, steps}: { wf: wfType, steps: Record<string, any> }) {
    const activeStepComponent = computed(() => steps[wf.activeStep.value]);
    return {
      loading: wf.loading,
      activeStepComponent,
    };
  },
});

</script>

<style lang="scss" scoped>
</style>
