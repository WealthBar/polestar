import * as assert from "assert";
import {dbProviderCtor, dbType, rolledback} from "node_core";
import {value as userInfoV1TestSql} from "./user_info.test_sql";
import {userInfoV1HandlerCtor} from "./user_info";
import * as sinon from "sinon";

async function setup(cb: (testCtxType) => Promise<void>): Promise<void> {
  const dbProvider = await dbProviderCtor(process.env.DB_WB_CLIENT_URL_TEST || 'postgres://postgres@localhost:5432/wealthbar_test');

  return rolledback(
    dbProvider,
    async (db) => {
      await db.none(userInfoV1TestSql);
      return cb(db);
    },
  );
}

describe('userInfoV1Handler', () => {
  it('ignores non v1/user_info request', () => setup(async (db: dbType) => {
    const currentDate = sinon.stub();
    const userInfoV1Handler = userInfoV1HandlerCtor(currentDate);

    const ctx = {
      url: {
        path: `/v1/foo`,
        params: [],
      },
      db: cb => cb(db),
      req: {
        headers: {
          authorization: 'Bearer test123',
        },
      },
      res: {
        statusCode: 0,
        setHeader: sinon.stub(),
        end: sinon.stub<any>(),
      },
    };

    await userInfoV1Handler(ctx);
    sinon.assert.notCalled(ctx.res.end);
    sinon.assert.notCalled(currentDate);
  }));
});