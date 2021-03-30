<template>
  <v-app class="primary">
      <v-dialog v-model="state.dialog" persistent max-width="600px" min-width="360px" overlay-opacity="100%">
        <v-tabs v-model="state.tab" show-arrows background-color="blue lighten-4" icons-and-text grow>
          <v-tabs-slider color="primary darken-1"></v-tabs-slider>
          <v-tab v-for="i in state.tabs" :key="i.name" class="px-1">
            <div class="ma-0">
              <font-awesome-icon :icon="i.icon"></font-awesome-icon>
              {{ i.name }}
            </div>
          </v-tab>
          <v-tab-item v-for="i in state.tabs" :key="i.name">
            <component :is="i.component"></component>
          </v-tab-item>
        </v-tabs>
      </v-dialog>
  </v-app>
</template>

<script lang="ts">
import '@/vue_comp';
import {signin, signup, forgotPassword} from '@/app/index';
import {reactive, defineComponent} from '@vue/composition-api';

const deps = {window};

export default defineComponent({
  components: {signin, signup, forgotPassword},
  name: 'app',
  setup() {
    const state = reactive({
      dialog: true,
      tab: 0,
      tabs: [
        {
          name: 'Signin',
          icon: ['fas', 'user'],
          component: signin,
        },
        {
          name: 'Signup',
          icon: ['far', 'user'],
          component: signup,
        },
        {
          name: 'Forgot Password',
          icon: ['fas', 'question'],
          component: forgotPassword,
        },
      ],
    });

    if (deps.window.location.toString().includes('signup')) {
      state.tab = 1;
    }

    return {
      state,
    };
  },
});

</script>

<style lang="scss" scoped>

</style>
