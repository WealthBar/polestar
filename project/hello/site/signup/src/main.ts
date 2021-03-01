import Vue, {CreateElement} from 'vue';
import app from './app.vue';
import Buefy from 'buefy';
import './theme.scss';
import {library} from '@fortawesome/fontawesome-svg-core';
import {fas} from '@fortawesome/free-solid-svg-icons';
import {fab} from '@fortawesome/free-brands-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/vue-fontawesome';

library.add(fas);
library.add(fab);
Vue.component('vue-fontawesome', FontAwesomeIcon);

Vue.use(Buefy, {
  defaultIconComponent: 'vue-fontawesome',
  defaultFieldLabelPosition: 'on-border',
  defaultIconPack: 'fas',
  customIconPacks: {
    fas: {
      sizes: {
        default: 'lg',
        'is-small': '1x',
        'is-medium': '2x',
        'is-large': '3x',
      },
      iconPrefix: '',
    },
    fab: {
      sizes: {
        default: 'lg',
        'is-small': '1x',
        'is-medium': '2x',
        'is-large': '3x',
      },
      iconPrefix: '',
    },
  },
});

Vue.config.productionTip = false;

new Vue({
  render(h: CreateElement) {
    return h(app);
  },
}).$mount('#app');
