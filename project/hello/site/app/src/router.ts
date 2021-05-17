import Vue from 'vue'
import VueRouter, { RouteConfig } from 'vue-router'
Vue.use(VueRouter)

const routes: Array<RouteConfig> = [
  {
    path: '*',
    redirect: '/v1',
  },
  {
    path: '/v1',
    component: () => import(/* webpackChunkName: "v1_layout" */ '@/app/v1/layout.vue'),
    children: [
      {
        path: '',
        redirect: 'dashboard',
      },
      {
        path: 'dashboard',
        component: () => import(/* webpackChunkName: "v1_dashboard" */ '@/app/v1/dashboard.vue'),
      },
      {
        path: '*',
        component: () => import(/* webpackChunkName: "notFound" */ '@/404.vue'),
      }
    ],
  },

]

export const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes
})
