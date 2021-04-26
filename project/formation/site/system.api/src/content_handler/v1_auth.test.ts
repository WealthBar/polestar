import {dbProviderCtor, dbType, isTuid, rolledback, secureTokenCtor} from 'node_core';
import * as assert from 'assert';
import {value as v1InitTestSql} from './v1_init.test_sql';
import * as sinon from 'sinon';
import {v1AuthHandler} from './v1_auth';
import {serializableType} from 'ts_agnostic';

async function setup(cb: (testCtxType) => Promise<void>): Promise<void> {
  assert(process.env?.DB_FORMATION_CLIENT_URL_TEST);
  const dbProvider = await dbProviderCtor(process.env.DB_FORMATION_CLIENT_URL_TEST);

  return rolledback(
    dbProvider,
    async (db) => {
      await db.none(v1InitTestSql);
      return cb(db);
    },
  );
}

describe('v1_auth', () => {
  it('accepts valid bearer', () => setup(async (db: dbType) => {
    const ctx = {
      url: {
        path: `/`,
        params: [],
      },
      note: {} as Record<string, serializableType>,
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
      remoteAddress: 'test',
    };

    await v1AuthHandler(ctx);
    sinon.assert.notCalled(ctx.res.end);
    const system = ctx.note['system'] as Record<string, string>;

    assert.strictEqual(system['systemName'], 'test');
    assert.strictEqual(system['bearerToken'], 'test123');
    assert(isTuid(system['systemId']));
    assert.strictEqual(system['domain'], 'test.xxx');
    assert.strictEqual(system['secretKey'], 'd0ed061c0e9e9490d662f9ed6c26c0d6269fb23ed34cdbd37436cce46736a1d6e7bee2cd490a4ebc43dbab6191f237e5');
    assert.strictEqual(system['errorUrl'], 'http://app.test.xxx');
  }));

  it('rejects invalid bearer', () => setup(async (db: dbType) => {
    const ctx = {
      url: {
        path: `/`,
        params: [],
      },
      note: {} as Record<string, serializableType>,
      db: cb => cb(db),
      req: {
        headers: {
          authorization: 'Bearer haxer',
        },
      },
      res: {
        statusCode: 0,
        setHeader: sinon.stub(),
        end: sinon.stub<any>(),
      },
      remoteAddress: 'test',
    };

    await v1AuthHandler(ctx);
    sinon.assert.called(ctx.res.end);
    assert.strictEqual(ctx.res.statusCode, 403);
    sinon.assert.calledWithExactly(ctx.res.setHeader, 'Content-Type', 'text/plain');

    assert.strictEqual(ctx.note['system'], undefined);
  }));

  it('rejects when auth is not bearer', () => setup(async (db: dbType) => {
    const ctx = {
      url: {
        path: `/`,
        params: [],
      },
      note: {} as Record<string, serializableType>,
      db: cb => cb(db),
      req: {
        headers: {
          authorization: 'haxer',
        },
      },
      res: {
        statusCode: 0,
        setHeader: sinon.stub(),
        end: sinon.stub<any>(),
      },
      remoteAddress: 'test',
    };

    await v1AuthHandler(ctx);
    sinon.assert.called(ctx.res.end);
    assert.strictEqual(ctx.res.statusCode, 403);
    sinon.assert.calledWithExactly(ctx.res.setHeader, 'Content-Type', 'text/plain');

    assert.strictEqual(ctx.note['system'], undefined);
  }));
});
