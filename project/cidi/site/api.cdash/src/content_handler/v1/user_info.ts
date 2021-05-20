import {resolvedVoid} from 'ts_agnostic';
import {ctxType, dbProviderCtxType} from 'node_core';
import {settings} from "../../settings";
import {value as userInfoSql} from "./user_info_sql";
import {DateTime} from 'luxon';
import {Object as O} from 'ts-toolbelt';

export const userInfoV1HandlerCtor = (currentDate: () => string) => {
  /*
  assumes:

    ALTER TABLE users
      ADD COLUMN ci_id uuid;

  */
  const errForbidden = JSON.stringify({err: "Forbidden"});
  const errServer = JSON.stringify({err: "ServerError"});
  const errInvalid = JSON.stringify({err: "InvalidRequest"});
  const resNoUserInfo = JSON.stringify({res: {}});

  const fromDbUserInfo = (row: Record<string, string>) => ({
    userCadValue: row['user_cad_value'],
    date: row['date'],
  });

  const firstOrUndefined = <T>(ts: T[]) => ts.length > 0 ? ts[0] : undefined;

  const prodHandler = (db: dbProviderCtxType, ciId: string) =>
    db(
      async (db) =>
        firstOrUndefined(
          (
            await db.any(userInfoSql, {ciId, asOf: currentDate()})
          ).map(
            fromDbUserInfo
          )
        )
    );

  const demoData: Record<string, string> = {};

  const demoHandler = (_: dbProviderCtxType, ciId: string) => demoData[ciId];

  const bearerMapping = {
    "p": prodHandler,
    "d": demoHandler
  };
  const modes = Object.keys(bearerMapping);

  const userInfoV1Handler = (ctx: Pick<ctxType, 'url' | 'db'>
    & O.P.Pick<ctxType, ['res', 'statusCode' | 'setHeader' | 'end']>
    & O.P.Pick<ctxType, ['req', 'headers']>) => {
    const res = ctx.res;

    try {
      if (ctx.url.path !== '/v1/user_details') {
        return resolvedVoid;
      }
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');

      const m = ctx.req.headers.authorization?.match(/^\s*Bearer\s(?<token>\w+)/);
      const token = m?.groups?.token;

      if (!token || !settings.bearerMapping[token]) {
        res.end(errForbidden);
        return resolvedVoid;
      }

      const mode = settings.bearerMapping[token].toLowerCase();
      const ciId = ctx.url.params.find(x => x[0] === 'ci_id')?.[1];

      if (!mode || !ciId || !modes.includes(mode)) {
        res.end(errInvalid);
        return resolvedVoid;
      }

      const userInfo = bearerMapping[mode]?.(ciId);

      if (userInfo) {
        res.end(JSON.stringify({
          res: {
            userInfo
          }
        }));
      } else {
        res.end(resNoUserInfo);
      }
    } catch (e) {
      console.error(e.toString());
      res.end(errServer);
    }
    return resolvedVoid;
  }

  return userInfoV1Handler;
}

const currentDate = (): string => DateTime.utc().toISODate();

export const internal = {currentDate};
export const userInfoV1Handler = userInfoV1HandlerCtor(currentDate);
