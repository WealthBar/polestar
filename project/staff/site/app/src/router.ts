import Vue from 'vue';
import Router from 'vue-router';
import Home from './views/home.vue';
import Profile from './views/profile.vue';
import {sessionAsync} from '@/session';
import {authz, authzFuncType} from '@/authz';
import {settings} from '@/settings';

Vue.use(Router);

export type RouteEntryType = {
  path: string;
  component: any;
  name: string;
  props?: boolean;
  children?: RouteEntryType[];
  meta?: {
    authz?: authzFuncType,
    excludeFromSidebar?: boolean,
  };
};

export const routes: RouteEntryType[] = [
  {
    path: '/',
    name: 'Home',
    component: Home,
  },
  {
    path: '/profile',
    name: 'Profile',
    component: Profile,
    meta: {
      authz: authz.anyUser,
    },
  },
  {
    path: '/about',
    name: 'About',
    // route level code-splitting
    // this generates a separate chunk (about.[hash]1.js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import(/* webpackChunkName: "about" */ './views/about.vue'),
  },
];

export const router = new Router({
  mode: 'history',
  base: process.env.BASE_URL,
  routes,
});

export const deps = {sessionAsync, settings};

router.beforeEach(async (to, from, next) => {
  const si = await deps.sessionAsync();

  // is there a pending redirect?
  const redirectKey = `${deps.settings.projectName}_redirectTo`;
  const routeTo = window.sessionStorage[redirectKey];
  delete window.sessionStorage[redirectKey];

  if (routeTo) {
    next(routeTo);
    return;
  }

  if (!to?.meta?.authz) {
    // no restrictions so allow access.
    next();
    return;
  }

  // current route requires permissions
  if (!si?.userId) {
    // no user yet

    // set redirect so we'll come back here after login
    window.sessionStorage[redirectKey] = to.path;

    // goto login
    window.location.assign('/api/auth');
    return;
  }

  if (!to.meta.authz(si)) {
    // user doesn't have access, go back to the home page.
    next('/');
  }

  // user has access so continue on.
  next();
});
