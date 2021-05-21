import * as assert from "assert";
import {dbProviderCtor, dbType, rolledback} from "node_core";
import {value as userInfoV1TestSql} from "./user_info.test_sql";
import {internal, userInfoV1HandlerCtor} from "./user_info";
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

const prodAuthorization = 'Bearer 5655885fab1d9806eb2c5adebbd5d2baab19b909d04aa94259365b4687d8e8aa47ea9384224a13d2fe84990dabb10f7eea36f6c01af5c268ea9527f356948c18';
const demoAuthorization = 'Bearer b53b00b9e6397d05f56a2b42ae026b2c9958efeb111f72d71348e7b4f0a8ba79d30040511fc667de8a2218cd971378116e27eb13e54028b6646daf42e2bdd3d1';
const getStubs = ({db, path, params, authorization}: {
    db: dbType,
    path: string,
    params?: [string, string][],
    authorization?: string,
  }
) => {
  const currentDate = sinon.stub();
  const onError = sinon.stub();
  const userInfoV1Handler = userInfoV1HandlerCtor(currentDate, onError);

  params ||= [];

  const ctx = {
    url: {
      path,
      params,
    },
    db: cb => cb(db),
    req: {
      headers: {
        authorization,
      },
    },
    res: {
      statusCode: 0,
      setHeader: sinon.stub(),
      end: sinon.stub<any>(),
    },
  };

  return {
    currentDate,
    onError,
    userInfoV1Handler,
    ctx,
  };
};

describe('userInfoV1Handler', () => {
  it('currentDate', () => {
    assert(internal.currentDate().match(/^\d{4}-\d{2}-\d{2}$/));
  });

  it('ignores non v1/user_info request', () => setup(async (db: dbType) => {
    const {
      currentDate,
      ctx,
      userInfoV1Handler,
    } = getStubs({
      db,
      path: `/v1/foo`,
      authorization: 'Bearer test123',
    });

    await userInfoV1Handler(ctx);

    sinon.assert.notCalled(ctx.res.end);
    sinon.assert.notCalled(currentDate);
  }));

  it('handles v1/user_info request for real user with data', () => setup(async (db: dbType) => {
    const {
      currentDate,
      ctx,
      userInfoV1Handler,
    } = getStubs({
      db,
      path: '/v1/user_info',
      params: [['ci_id', '00050000-4000-8000-0000-000000000001']] as [string, string][],
      authorization: prodAuthorization,
    });

    currentDate.returns('2021-02-02');

    await userInfoV1Handler(ctx);

    sinon.assert.called(currentDate);
    sinon.assert.calledWith(ctx.res.end, `{"res":{"userInfo":{"asOf":"2021-02-01","userCadValue":"200001"}}}`);
  }));

  it('handles v1/user_info request with server error', () => setup(async (db: dbType) => {
    const {
      currentDate,
      ctx,
      userInfoV1Handler,
      onError,
    } = getStubs({
      db,
      path: '/v1/user_info',
      params: [['ci_id', '00050000-4000-8000-0000-000000000001']] as [string, string][],
      authorization: prodAuthorization,
    });

    currentDate.throws('error 123');

    await userInfoV1Handler(ctx);

    sinon.assert.called(currentDate);
    sinon.assert.calledWith(onError, 'error 123');
    sinon.assert.calledWith(ctx.res.end, `{"err":"ServerError"}`);
  }));

  it('handles v1/user_info request for real user with no recent data', () => setup(async (db: dbType) => {
    const {
      currentDate,
      ctx,
      userInfoV1Handler,
    } = getStubs({
      db,
      path: '/v1/user_info',
      params: [['ci_id', '00050000-4000-8000-0000-000000000001']] as [string, string][],
      authorization: prodAuthorization,
    });

    currentDate.returns('2021-05-02');

    await userInfoV1Handler(ctx);

    sinon.assert.called(currentDate);
    sinon.assert.calledWith(ctx.res.end, `{"res":{}}`);
  }));

  it('handles v1/user_info request for user that does not exist', () => setup(async (db: dbType) => {
    const {
      currentDate,
      ctx,
      userInfoV1Handler,
    } = getStubs({
      db,
      path: '/v1/user_info',
      params: [['ci_id', '00050000-4000-8000-0000-100000000001']] as [string, string][],
      authorization: prodAuthorization,
    });

    currentDate.returns('2021-01-02');

    await userInfoV1Handler(ctx);

    sinon.assert.called(currentDate);
    sinon.assert.calledWith(ctx.res.end, `{"res":{}}`);
  }));

  it('handles v1/user_info request missing ci_id', () => setup(async (db: dbType) => {
    const {
      currentDate,
      ctx,
      userInfoV1Handler,
    } = getStubs({
      db,
      path: '/v1/user_info',
      params: [['ciid', '00050000-4000-8000-0000-000000000001']] as [string, string][],
      authorization: prodAuthorization,
    });

    currentDate.returns('2021-01-02');

    await userInfoV1Handler(ctx);

    sinon.assert.notCalled(currentDate);
    sinon.assert.calledWith(ctx.res.end, `{"err":"InvalidRequest"}`);
  }));

  it('handles v1/user_info request for demo user with data', () => setup(async (db: dbType) => {
    const {
      currentDate,
      ctx,
      userInfoV1Handler,
    } = getStubs({
      db,
      path: '/v1/user_info',
      params: [['ci_id', '00050000-4000-8000-0000-000000000001']] as [string, string][],
      authorization: demoAuthorization,
    });

    currentDate.returns('2021-02-02');

    await userInfoV1Handler(ctx);

    sinon.assert.notCalled(currentDate);
    sinon.assert.calledWith(ctx.res.end, `{"res":{"userInfo":{"asOf":"2021-03-01","userCadValue":"123456"}}}`);
  }));

  it('handles v1/user_info request no auth', () => setup(async (db: dbType) => {
    const {
      currentDate,
      ctx,
      userInfoV1Handler,
    } = getStubs({
      db,
      path: '/v1/user_info',
      params: [['ci_id', '00050000-4000-8000-0000-000000000001']] as [string, string][],
    });

    currentDate.returns('2021-02-02');

    await userInfoV1Handler(ctx);

    sinon.assert.notCalled(currentDate);
    sinon.assert.calledWith(ctx.res.end, `{"err":"Forbidden"}`);
  }));

  it('handles v1/user_info request invalid auth token', () => setup(async (db: dbType) => {
    const {
      currentDate,
      ctx,
      userInfoV1Handler,
    } = getStubs({
      db,
      path: '/v1/user_info',
      params: [['ci_id', '00050000-4000-8000-0000-000000000001']] as [string, string][],
      authorization: 'Bearer Bob',
    });

    currentDate.returns('2021-02-02');

    await userInfoV1Handler(ctx);

    sinon.assert.notCalled(currentDate);
    sinon.assert.calledWith(ctx.res.end, `{"err":"Forbidden"}`);
  }));
});