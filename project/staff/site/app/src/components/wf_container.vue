<template>
  <div>
    <div v-if="loaded">
        <v-form ref='form' v-model="valid" style="width:30rem" @submit.prevent="onSubmit">
          <v-container>
            <v-fade-transition hide-on-leave>
              <component
                v-if="activeStep"
                :is="activeStepComponent"
                :key="$route.params.contentHash"
              ></component>
            </v-fade-transition>
          </v-container>
        </v-form>
    </div>
    <div v-else-if="error">
      An error occurred, please try again later.
    </div>
    <div v-else>
      Loading...
    </div>
  </div>
</template>

<script lang="ts">

  import Vue from 'vue';
  import {last, cloneDeep} from 'lodash';
  import {workOrderStateType, workOrderApi} from '@/api/workorder_api';
  import {router} from '@/router';

  function updateContentHash(path: string, currentContentHash: string | undefined, newContentHash: string) {
    if (currentContentHash) {
      path = path.substring(
        0,
        path.length - currentContentHash.length,
      ) + newContentHash;
    } else {
      path = path + (path.endsWith('/') ? '' : '/') + newContentHash;
    }
    return path;
  }

  export default Vue.extend<any, any, any, any>(
    {
      name: 'wfContainer',
      props: {
        steps: {type: Object, required: true},
        contextName: {type: String, required: true},
        apiName: {type: String, required: true},
        close: {type: Function, required: true},
      },
      data() {
        return {
          activeStep: '',
          wfStep: undefined as Vue|undefined,
          workOrder: {state: {meta: {navHistory: ['name'], data: {}}}},
          computed: {},
          valid: false,
          loaded: false,
          error: false,
          skipInit: false,
        };
      },
      methods: {
        updateState(updater: (s: workOrderStateType) => void) {
          updater(this.workOrder?.state);
        },
        async update(stateList: workOrderStateType[]) {
          // [0] is the current step, updated
          // [1] is the step to navigate to
          const wo = await workOrderApi(this.apiName, {
            op: 'UPDATE',
            contextName: this.contextName,
            stateList,
          });

          if (!wo) {
            this.error = true;
            return;
          }

          if (wo.err) {
            this.wfStep.onErr(wo.err);
            return;
          }

          if (!wo.workOrder) {
            this.error = true;
            return;
          }

          if (wo.workOrderList && wo.workOrderList[0].contentHash !== this.workOrder.contentHash) {
            const replacePath = updateContentHash(
              this.$route.path,
              this.$route.params.contentHash,
              wo.workOrderList[0].contentHash,
            );
            this.skipInit = true;
            await this.$router.replace(replacePath);
            this.skipInit = false;
          }

          const newPath = updateContentHash(
            this.$route.path,
            this.$route.params.contentHash,
            wo.workOrder.contentHash,
          );
          await this.$router.push(newPath);
        },
        async goPrevious(updater: (s: workOrderStateType) => void | undefined) {
          if (updater) {
            this.updateState(updater);
          }

          const stateList = [cloneDeep(this.workOrder.state), cloneDeep(this.workOrder.state)];
          if (stateList[1].meta.navHistory.length >= 2) {
            stateList[1].meta.navHistory.pop();
          }
          await this.update(stateList);
        },
        async goToPath(updater: (s: workOrderStateType) => void | undefined, path: string[]) {
          if (updater) {
            this.updateState(updater);
          }

          this.$refs.form.resetValidation();
          const stateList = [cloneDeep(this.workOrder.state), cloneDeep(this.workOrder.state)];
          stateList[1].meta.navHistory = path;
          await this.update(stateList);
        },
        async goNext(updater: (s: workOrderStateType) => void | undefined, where: string) {
          if (this.$refs.form.validate() && this.valid) {
            if (updater) {
              this.updateState(updater);
            }
            this.$refs.form.resetValidation();
            const stateList = [cloneDeep(this.workOrder.state), cloneDeep(this.workOrder.state)];
            stateList[1].meta.navHistory.push(where);
            await this.update(stateList);
          }
        },
        async onCommit(to: string) {
          const wo = await workOrderApi(this.apiName, {
            op: 'COMMIT',
            contextName: this.contextName,
            state: this.workOrder.state,
          });
          if (wo?.workOrder?.frozenAt) {
            await this.$router.push(to);
            return;
          }
          if (wo?.err) {
            this.wfStep.onErr(wo.err);
            return;
          }
          this.error = true;
        },
        async onClose() {
          return this.close();
        },
        async init(wo: any) {
          if (this.skipInit) {
            // used during the route.replace to update the previous state when navigating.
            return;
          }

          this.workOrder = wo?.workOrder;
          this.computed = wo?.computed;

          if (!this.workOrder) {
            this.error = true;
          } else {
            if (!this.workOrder?.state) {
              this.$set(this.workOrder, 'state', {});
            }
            if (!this.workOrder.state?.step) {
              this.error = true;
            }
            if (this.$route.params.contentHash !== this.workOrder.contentHash) {
              await router.replace(
                updateContentHash(
                  this.$route.path,
                  this.$route.params.contentHash,
                  this.workOrder.contentHash,
                ),
              );
            }
            const currentStep = last(this.workOrder.state.meta.navHistory);
            if (this.activeStep !== currentStep) {
              this.activeStep = currentStep;
            }
            this.loaded = true;
          }
        },
        async resume(contentHash: string) {
          const wo = await workOrderApi(this.apiName, {
            op: 'RESUME',
            contextName: this.contextName,
            contentHash,
          });
          if (wo?.workOrder?.frozenAt) {
            return this.close();
          }
          await this.init(wo);
        },
        onSubmit() {
          this.wfStep?.onSubmit();
        },
      },
      async created() {
        await this.resume(this.$route.params.contentHash);
      },
      computed: {
        activeStepComponent() {
          if (!this.steps || !this.steps[this.activeStep]) {
            return;
          }
          return this.steps[this.activeStep];
        },
      },
      watch: {
        async $route(to, from) {
          await this.resume(to.params.contentHash);
        },
      },
    },
  );

</script>
