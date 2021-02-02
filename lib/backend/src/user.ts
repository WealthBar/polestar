// istanbul ignore file
// -- will be replaced with DB based user storage

import {contentHandlerType, ctxReqType, gauthUserInfoType, reqHandlerType, userStoreType} from './server.type';
import {tuidCtor} from './tuid';
import {resolvedVoid} from 'lib_agnostic/src/resolved';

const userStore: userStoreType = {};
export type userVivifyType = (gauthUserInfo: gauthUserInfoType, rawAuthResponse: string) => Promise<string>;

export function userVivifyCtor(): userVivifyType {
  return async function userVivify({
      email,
      email_verified,
      name,
      picture,
      given_name,
      family_name,
      locale,
    }: gauthUserInfoType,
    rawAuthResponse: string,
  ): Promise<string> {
    let u = Object.values(userStore).find(us => us.email === email);
    if (!u) {
      const userId = tuidCtor();
      u = {userId, email, email_verified, name, picture, given_name, family_name, locale, rawAuthResponse};
      userStore[userId] = u;
    }
    return u.userId;
  }
}

export type userVivifyCtorType = typeof userVivifyCtor;


export function userSetCtor(settings: Record<string, unknown>): reqHandlerType {
  return function userSet(ctx: ctxReqType): Promise<void> {
    if (ctx.session.userId) {
      ctx.user = userStore[ctx.session.userId];
    }
    return resolvedVoid;
  }
}

export type userSetCtorType = typeof userSetCtor;
