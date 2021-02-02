import Vue from 'vue';
import App from './app.vue';
import {router} from './router';
import Vuetify from 'vuetify';
import 'material-design-icons-iconfont/dist/material-design-icons.css';
import 'vuetify/dist/vuetify.css';
import {vAuthz} from './authz';
import {vSession} from '@/session';
import {vSettings} from '@/settings';
import {vRpc} from '@/rpc';

/* istanbul ignore next: bootstrap code */
(function bootstrap() {
  Vue.config.productionTip = false;
  Vue.use(Vuetify);
  Vue.use(vAuthz);
  Vue.use(vSession);
  Vue.use(vSettings);
  Vue.use(vRpc);

  Vue.filter('$json', (value: any) => JSON.stringify(value, null, 2));
  new Vue({
    router,
    vuetify: new Vuetify({
      icons: {
        iconfont: 'md',
      },
      theme: {
        dark: false,
      },
    }),
    render: (h) => h(App),
  }).$mount('#app');
}());
