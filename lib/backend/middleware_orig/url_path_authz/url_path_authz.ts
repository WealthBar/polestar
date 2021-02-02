import debugCtor = require('debug');
import {ctxAuthzType, authzType} from '../../authz';
import {ctxSessionType} from '../session/session';
import {ctxType} from '../../ctx.type';

export function urlPathAuthzCtor(path: string, authz: authzType): (ctx: ctxType & ctxAuthzType & ctxSessionType, next) => Promise<void> {
  const debug = debugCtor(`middleware:urlPathAuth:${path}`);
  return function (ctx: ctxType & ctxAuthzType & ctxSessionType, next) {
    debug(ctx.url);

    if (!ctx.url.startsWith(path)) {
      debug('ignored');
      return next();
    }

    if (!authz(ctx)) {
      debug('denied');
      if (ctx.sessionInfo?.userId) {
        ctx.status = 403;
        ctx.body = '403 Forbidden';
      } else {
        ctx.status = 401;
        ctx.body = '401 Authorization Required';
      }
      return;
    }

    debug('allowed');
    return next();
  };
}
