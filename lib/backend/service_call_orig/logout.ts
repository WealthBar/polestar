import {dbSession} from '../db/db_session';
import {ctxType} from '../../../../project/staff/backend/src/ctx.type';
import {ctxSessionType} from '../middleware/session/session';
import {ctxRequestIdType} from '../middleware/request_id/request_id';
import Koa from 'koa';

const epoch = new Date(0);

export async function logout(ctx: ctxType & ctxSessionType & ctxRequestIdType & Koa.ExtendableContext): Promise<void> {
  if (ctx.sessionInfo.sessionId) {
    await dbSession.delete(ctx.sessionInfo.sessionId, ctx.requestId);
  }
  for (const hdr of Object.entries(ctx.headers)) {
    if (hdr[0].toLowerCase() === 'cookie') {
      const m = (hdr[1] as string)?.match(`^(?<name>[^=]*)=`);
      const name = m?.groups?.name;
      if (name) {
        ctx.cookies.set(name, '', {expires: epoch});
      }
    }
  }
  ctx.body = {};
  ctx.status = 302;
}
