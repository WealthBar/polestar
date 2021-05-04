<template>
  <div>
    <code>
      {{ stoken }}
      {{ content_hash }}
    </code>
    <component
      :is="flowComponent"
      :wf="wf"
    >
    </component>
  </div>
</template>

<script lang="ts"> import '@/vue_comp';
import {defineComponent} from "@vue/composition-api";
import {router} from "@/router";
import {woApiCtor,wfCtor} from "vue_workflow";
import {wsApp} from "@/app/ws";
import {flow} from "@/app/v1/flow";

export default defineComponent({
  name: 'fill',
  props: {
    stoken: {type: String, required: true},
    content_hash: {type: String, required: false},
  },
  async setup({stoken, content_hash}: { stoken: string, content_hash?: string }) {
    const {flowName, formRequestId} = await wsApp.wfFlowInfo({stoken});

    const flowComponent = flow[flowName];
    const wf = wfCtor(
      woApiCtor(wsApp.woOp),
      `v1/${flowName}:${formRequestId}`,
      (content_hash:string)=>router.replace(`v1/fill/${stoken}/${content_hash}`),
      (content_hash:string)=>router.push(`v1/fill/${stoken}/${content_hash}`),
      async (msg: string) => {
        console.error(msg)
      },
    );

    await wf.resume(content_hash);

    return {stoken, content_hash, wf, flowComponent};
  },
});

</script>

<style lang="scss">
</style>
