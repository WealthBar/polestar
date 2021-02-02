import {session} from '@/session';
import {sessionInfoType} from '@/api/session_info';

export type authzFuncType = (si: sessionInfoType) => boolean;

export const authz = {
  allOf(ps: string[]): authzFuncType {
    return ((si: sessionInfoType) => ps.every((p: string) => si?.permission[p]));
  },
  anyUser(si: sessionInfoType): boolean { return !!si?.userId; },
};

export const vAuthz = {
  install(vue: any, options: any) {
    vue.mixin({
        methods: {
          $authzAllOf: (ps: string[]) => authz.allOf(ps)(session()),
          $authzAnyUser: () => authz.anyUser(session()),
          $authzAuthz: (authzFunc: authzFuncType) => authzFunc?.(session()),
        },
      },
    );
  },
};
