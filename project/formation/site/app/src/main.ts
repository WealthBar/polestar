import Vue from 'vue'
import App from './app.vue'
import './register_service_worker'

Vue.config.productionTip = false

new Vue({
  render: h => h(App),
}).$mount('#app')
