import Vue from 'vue';
import '@vue/composition-api';
import Vuetify, {VuetifyPreset} from 'vuetify';
import 'vuetify/dist/vuetify.min.css';
import './theme.scss';
import {library} from '@fortawesome/fontawesome-svg-core';
import {fas} from '@fortawesome/free-solid-svg-icons';
import {far} from '@fortawesome/free-regular-svg-icons';
import {fab} from '@fortawesome/free-brands-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/vue-fontawesome';
import App from './app.vue';


library.add(fas, far, fab);
Vue.component('font-awesome-icon', FontAwesomeIcon);

Vue.use(Vuetify);


const opts: Partial<VuetifyPreset> = {
  icons: {
    iconfont: 'faSvg',
    values: {
      complete: {
        component: FontAwesomeIcon,
        props: {icon: ['far', 'eye']},
      },
    },
  },
};

export const vuetify = new Vuetify(opts);

new Vue({
  vuetify,
  el: '#app',
  render: h => h(App),
}).$mount('#app');
