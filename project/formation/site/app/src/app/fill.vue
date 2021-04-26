<template>
  <div>
    <code>
      {{ stoken }}
      {{ content_hash }}
    </code>
  </div>
</template>

<script lang="ts"> import '@/vue_comp';
import {defineComponent} from "@vue/composition-api";
import {router} from "@/router";
import {wfCtor} from "vue_workflow/dist/wf";
import {woApiCtor} from "vue_workflow/dist/api";
import {wsApp} from "@/app/ws";

export default defineComponent({
  name: 'fill',
  props: {
    stoken: {type: String, required: true},
    content_hash: {type: String, required: false},
  },
  async setup({stoken, content_hash}: { stoken: string, content_hash?: string }) {
    const {wfName} = await wsApp.wfName({stoken});

    const wf = wfCtor(
      woApiCtor(wsApp.woOp),
      `v1/${wfName}/${stoken}`,
      router.replace,
      router.push,
      async (msg)=>{console.error(msg)},
    );

    await wf.resume(content_hash);

    return {stoken, content_hash};
  },
});

</script>

<style lang="scss">
</style>
