import {resolvedVoid, serialize} from 'ts_agnostic';
import {ctxType, dbProviderCtxType} from 'node_core';
import {settings} from "../../settings";
import {value as userInfoSql} from "./user_info_sql";
import {DateTime} from 'luxon';
import {Object as O} from 'ts-toolbelt';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const userInfoV1HandlerCtor = (
  currentDate: () => string,
  onError: (err: string) => void,
) => {
  /*
  assumes:

    ALTER TABLE users
      ADD COLUMN ci_id uuid;

    CREATE INDEX users_ci_id ON users (ci_id);

  */
  const errForbidden = JSON.stringify({err: "Forbidden"});
  const errServer = JSON.stringify({err: "ServerError"});
  const errInvalid = JSON.stringify({err: "InvalidRequest"});
  const resNoUserInfo = JSON.stringify({res: {}});

  const fromDbUserInfo = (row: Record<string, string>) => ({
    userCadValue: row['user_cad_value'],
    asOf: row['date'],
  });

  const firstOrUndefined = <T>(ts: T[]) => ts.length > 0 ? ts[0] : undefined;

  const prodHandler = async (db: dbProviderCtxType, ciId: string) =>
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

  const demoData: Record<string, Record<string, string>> = {
    '00050000-4000-8000-0000-000000000001': {
      userCadValue: '123456',
      asOf: '2021-03-01',
    }
  };

  const demoHandler = async (_: dbProviderCtxType, ciId: string) => demoData[ciId];

  const bearerMapping: Record<string, (db: dbProviderCtxType, ciId: string) => Promise<Record<string, string> | undefined>> = {
    "p": prodHandler,
    "d": demoHandler
  };
  const modes = Object.keys(bearerMapping);

  const userInfoV1Handler = async (ctx: Pick<ctxType, 'url' | 'db'>
    & O.P.Pick<ctxType, ['res', 'statusCode' | 'setHeader' | 'end']>
    & O.P.Pick<ctxType, ['req', 'headers']>) => {
    const res = ctx.res;

    try {
      if (ctx.url.path !== '/v1/user_info') {
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

      const userInfo = await bearerMapping[mode](ctx.db, ciId);

      if (userInfo) {
        res.end(serialize({
          res: {
            userInfo
          }
        }));
      } else {
        res.end(resNoUserInfo);
      }
    } catch (e) {
      onError(e.toString());
      res.end(errServer);
    }
    return resolvedVoid;
  }

  return userInfoV1Handler;
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
const currentDate = () => DateTime.utc().toISODate() as string;

// istanbul ignore next -- correct by inspection
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
const onError = (err: string) => {
  console.error(err);
};

export const internal = {
  currentDate,
  onError,
};
export const userInfoV1Handler = userInfoV1HandlerCtor(
  currentDate,
  onError,
);
