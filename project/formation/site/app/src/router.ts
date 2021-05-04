import Vue from 'vue'
import VueRouter, { RouteConfig } from 'vue-router'

Vue.use(VueRouter)

const routes: RouteConfig[] = [
  {
    path: 'v1/fill/:stoken/:content_hash?',
    name: 'fill',
    props: true,
    component: () => import(/* webpackChunkName: "fill" */ '@/app/fill.vue')
  },
  {
    path: '*',
    component: () => import(/* webpackChunkName: "404" */ '@/app/404.vue')
  }
]

export const router = new VueRouter({
  mode: 'history',
  base: '/',
  routes
})
