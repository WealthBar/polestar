import {dbPermissionType} from '../../db/db_permission';
import {dbUserType} from '../../db/db_user';

import debugCtor = require('debug');
import {ctxType} from '../../../../../project/staff/backend/src/ctx.type';
import {ctxSessionType} from '../session/session';
import {ctxRequestIdType} from '../request_id/request_id';

const debug = debugCtor('middleware:user');

type passportStateType = { user?: { email?: string, name?: string } };

export type userType = (ctx: ctxType & ctxSessionType & ctxRequestIdType & { state?: passportStateType }, next: () => Promise<void>) => Promise<void>;
export function userCtor(dbUser: dbUserType, dbPermission: dbPermissionType) : userType {
  return async function user(ctx: ctxType & ctxSessionType & ctxRequestIdType & { state?: passportStateType }, next: () => Promise<void>): Promise<void> {
    // state is where passport stores the login information

    const {sessionInfo, state} = ctx;

    debug('sessionInfo:%o', sessionInfo);
    debug('state:%o', state);

    // if no userId in session and state exists then a password login is happening.
    // vivify the user and update the session.
    if (!sessionInfo.userId && state?.user?.email) {
      sessionInfo.userId = await dbUser.vivify({
        email: state.user.email,
        displayName: state.user.name || '',
      }, ctx.requestId);
      sessionInfo.displayName = state.user.name;
      sessionInfo.email = state.user.email;
      debug(`execute vivify returned userId: ${sessionInfo.userId}`);
    }

    if (sessionInfo.userId) {
      const userId = sessionInfo.userId;
      const userInfo = await dbUser.byId(userId, ctx.requestId);
      debug(`execute byId(${sessionInfo.userId}) returned ${JSON.stringify(userInfo)}`);
      sessionInfo.displayName = userInfo?.displayName;
      sessionInfo.email = userInfo?.email;
      sessionInfo.permission = await dbPermission(userId, ctx.requestId);
    }

    // remove the passport cruft from the ctx now that we've updated ctx.sessionInfo
    if (state) {
      delete ctx.state;
    }

    await next();
  };
}
