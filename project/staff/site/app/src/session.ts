import Vue from 'vue';
import {sessionInfoType, sessionInfo} from './api/session_info';

const initial = {permission: {}};
const observable = Vue.observable({session: Object.assign({}, initial)});

let pendingPromise: Promise<void> | undefined;

export function session(): sessionInfoType {
  // non-blocking update
  if (!pendingPromise) {
    pendingPromise = sessionInfo().then(
      (si:any) => {
        if (si) {
          Vue.set(observable, 'session', si);
        } else {
          Vue.set(observable, 'session', Object.assign({}, initial));
        }
      })
      .catch((err:any) => console.error(err))
      .finally(() => {
        pendingPromise = undefined;
      });
  }
  return observable.session;
}

export async function sessionAsync(): Promise<sessionInfoType> {
  Vue.set(observable, 'session', await sessionInfo());
  return observable.session;
}

export const vSession = {
  install(vue: any, options: any) {
    vue.mixin({
      computed: {
        $session() {
          return session();
        },
      },
    });
  },
};
