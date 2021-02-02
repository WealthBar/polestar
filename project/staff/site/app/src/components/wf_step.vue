<template>
  <div>
    <v-card raised outlined>
      <v-card-title class="grey lighten-5">
        {{this.title}}
        <v-spacer></v-spacer>
        <v-btn icon @click="onClose">
          <v-icon>close</v-icon>
        </v-btn>
      </v-card-title>
      <v-card-text>
        <slot>
        </slot>
      </v-card-text>
      <v-card-actions v-if="actions">
        <v-btn v-if="origin" :to="origin">Previous</v-btn>
        <v-btn v-else @click="goPrevious">Previous</v-btn>
        <v-spacer></v-spacer>
        <v-btn type="submit" v-if="next">Next</v-btn>
        <v-btn type="submit" v-if="commit">Commit</v-btn>
      </v-card-actions>
    </v-card>
  </div>
</template>

<script lang="ts">
  import Vue from 'vue';
  import {findInParents} from '@/find_in_parents';

  export default Vue.extend<any, any, any, any>({
    name: 'wfStep',
    props: {
      title: {type: String, required: true},
      origin: {type: String, required: false, default: undefined},
      next: Function,
      commit: String,
      updater: {type: Function, required: false},
      onState: {type: Function, required: true},
      onComputed: {type: Function, required: false},
      onValidate: {type: Function, required: false},
      onError: {type: Function, required: false},
    },
    data() {
      return {
        wfContainer: undefined as any,
      };
    },
    methods: {
      async goPrevious() {
        return this.wfContainer.goPrevious(this.updater);
      },
      async goBackTo(stepName: string) {
        const navHistory = this.wfContainer.workOrder.state.meta.navHistory;
        let stepIndex = navHistory.indexOf(stepName);
        if (stepIndex < 0) {
          stepIndex = 0;
        }
        const newPath = navHistory.slice(0, stepIndex + 1);
        return this.wfContainer.goToPath(this.updater, newPath);
      },
      async goNext() {
        if (this.onValidate && !this.onValidate()) {
          return;
        }
        return this.wfContainer.goNext(this.updater, this.next());
      },
      async onCommit() {
        if (this.onValidate && !this.onValidate()) {
          return;
        }
        return this.wfContainer.onCommit(this.commit);
      },
      onClose() {
        this.wfContainer.onClose();
      },
      onSubmit() {
        if (this.next) {
          this.goNext();
        } else if (this.commit) {
          this.onCommit();
        }
      },
      onErr(err: string[]) {
        if (this.onError) {
          this.onError(err);
        }
      },
    },
    // I tried activated/deactivated and using keep-alive and it did not work well.
    mounted() {
      this.wfContainer = findInParents(this, 'wfContainer', 10);
      if (!this.wfContainer) {
        throw new Error('wfStep not contained in wfContainer');
      }
      this.wfContainer.wfStep = this;
    },
    beforeDestroy() {
      this.wfContainer.wfStep = undefined;
    },
    computed: {
      actions(): boolean {
        return this.origin !== undefined || !!this.next || !!this.commit;
      },
    },
    watch: {
      'wfContainer.workOrder': function onState(to, _) {
        this.onState?.(to?.state);
      },
      'wfContainer.computed': function onComputed(to, _) {
        this.onComputed?.(to);
      },
    },
  });
</script>
