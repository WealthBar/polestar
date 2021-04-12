import {dbProviderCtor, dbType, rolledback, secureTokenCtor} from 'node_core';
import * as assert from 'assert';
import {value as v1InitTestSql} from './v1_init.test_sql';
import {v1InitHandler} from './v1_init';
import * as sinon from 'sinon';
import {v1AuthHandler} from './v1_auth';

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

describe('v1_init', () => {
  it('accepts request', () => setup(async (db: dbType) => {
    const sk = 'd0ed061c0e9e9490d662f9ed6c26c0d6269fb23ed34cdbd37436cce46736a1d6e7bee2cd490a4ebc43dbab6191f237e5';
    const stoken = secureTokenCtor(sk);

    const init = {
      formKey: 'test_key',
      brand: 'test',
      jurisdiction: 'ca_bc',
      signingDate: '2021-03-01',
      locale: 'en',
      validUntil: '2021-03-31T23:59:59Z',
      data: {
        'firstName': 'bob',
      },
    };

    const ctx = {
      url: {
        path: `/v1/init/${stoken}`,
        params: [],
      },
      body: JSON.stringify(init),
      note: undefined,
      db: cb => cb(db),
      req: {
        on: sinon.stub(),
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

    await v1InitHandler(ctx);

    assert(ctx.req.on.notCalled);
    assert.strictEqual(ctx.res.statusCode, 200);
    sinon.assert.calledWith(ctx.res.setHeader, 'Content-Type', 'application/json');
    sinon.assert.calledWith(ctx.res.end, '{}');

    const r = await db.one('SELECT system_name, form_key_name, brand_name, jurisdiction_name, signing_date::VARCHAR AS signing_date, tz_to_iso(valid_until) AS valid_until, locale_name, form_data FROM form_request WHERE stoken=DECODE($(stoken), \'hex\')', {stoken});
    assert.strictEqual(r.system_name, 'test');
    assert.strictEqual(r.form_key_name, 'test_key');
    assert.strictEqual(r.brand_name, 'test');
    assert.strictEqual(r.jurisdiction_name, 'ca_bc');
    assert.strictEqual(r.signing_date, '2021-03-01');
    assert.strictEqual(r.valid_until, '2021-03-31T23:59:59Z');
    assert.strictEqual(r.locale_name, 'en');
    assert.deepStrictEqual(r.form_data, {'firstName': 'bob'});
  }));
});
