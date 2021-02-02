import Vue from 'vue'
import {app} from '.'
import router from './router'

Vue.config.productionTip = false

new Vue({
  router,
  render: h => h(app)
}).$mount('#app')
