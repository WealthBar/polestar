<template>
  <div>
    <v-form @submit.prevent="onSubmit">
      <v-card raised outlined>
        <v-card-title class="grey lighten-5">
          {{ title }}
          <v-spacer v-if="close"></v-spacer>
          <v-btn icon @click="onClose" v-if="close">
            <font-awesome-icon :icon="['far','close']"></font-awesome-icon>
          </v-btn>
        </v-card-title>
        <v-card-text>
          <slot>
          </slot>
        </v-card-text>
        <v-card-actions v-if="actions">
          <v-btn v-if="origin" :to="origin">Previous</v-btn>
          <v-btn v-else @click="onPrev">Previous</v-btn>
          <v-spacer></v-spacer>
          <v-btn type="submit" v-if="next">Next</v-btn>
          <v-btn type="submit" v-if="sign">Sign</v-btn>
          <v-btn type="submit" v-if="commit">Commit</v-btn>
        </v-card-actions>
      </v-card>
    </v-form>
  </div>
</template>

<script lang="ts">
import '../vue_comp';
import {defineComponent} from '@vue/composition-api';
import {wfType} from '../wf';

export default defineComponent({
  name: 'wfStep',
  props: {
    wf: {type: Object, required: true},
    title: {type: String, required: true},
    origin: {type: String, required: false, default: undefined},
    validate: {type: Function, required: false, default: undefined},
    next: {type: Function, required: false, default: undefined},
    sign: {type: Function, required: false, default: undefined},
    commit: {type: Function, required: false, default: undefined},
    close: {type: Function, required: false, default: undefined},
  },
  setup({
    wf,
    validate,
    next,
    sign,
    commit,
  }: {
    wf: wfType,
    title: string,
    origin: string,
    validate?: () => Promise<boolean>,
    next?: () => Promise<string>,
    sign?: () => Promise<string>,
    commit?: () => Promise<string>,
    close?: () => Promise<string>,
  }) {
    const actionCount = [sign, next, commit].map(x => (x ? 1 : 0) as number).reduce((a, b) => a + b, 0);

    if (actionCount > 1) {
      throw new Error('INVALID_ARGUMENTS');
    }

    const actions = actionCount > 0;

    async function onPrev() {
      return wf.prev();
    }

    async function onNext() {
      if (!next || (validate && !(await validate()))) {
        return;
      }
      return wf.next(await next());
    }

    async function onCommit() {
      if (!commit || (validate && !(await validate()))) {
        return;
      }
      return wf.commit(await commit());
    }

    async function onSign() {
      if (!sign || (validate && !(await validate()))) {
        return;
      }
      return wf.sign(await sign());
    }

    async function onClose() {
      if (!close) { return ; }
      return close();
    }

    async function onSubmit() {
      if (commit) {
        return onCommit();
      }
      if (sign) {
        return onSign();
      }
      if (next) {
        return onNext();
      }
    }

    return {
      actions,
      onPrev,
      onSubmit,
      onClose,
    };
  },
});
</script>
