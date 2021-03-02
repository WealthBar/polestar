import {_internal_, ctxCtor} from './ctx';
import * as assert from 'assert';
import {ctxType, serverSettingsType} from './server.type';
import {dbProviderStub} from './db';
import * as sinon from 'sinon';

function commonChecks(ctx: ctxType, res: any, req: any) {
  assert.strictEqual(ctx.sessionId, '');
  assert.strictEqual(ctx.user, undefined);
  assert.deepStrictEqual(ctx.session, {});
  assert.strictEqual(ctx.res, res);
  assert.strictEqual(ctx.req, req);
}

describe('ctxCtor', () => {
  it('basics', async () => {
    const req: any = {
      url: '/hello?a=1&b=2',
      headers: {
        cookie: 'c=3; d=4',
      },
    };
    const res: any = {};
    const db = dbProviderStub(sinon);
    const ctx = ctxCtor(req, res, db.dbProvider, {} as any);
    commonChecks(ctx, res, req);
    assert.deepStrictEqual(ctx.url, {path: '/hello', params: [['a', '1'], ['b', '2']]});
    assert.deepStrictEqual(ctx.cookie, [['c', '3'], ['d', '4']]);
  });


  it('no url', async () => {
    const req: any = {
      url: undefined,
      headers: {
        cookie: '',
      },
    };
    const res: any = {};
    const db = dbProviderStub(sinon);
    const ctx = ctxCtor(req, res, db.dbProvider, {} as any);

    commonChecks(ctx, res, req);
    assert.deepStrictEqual(ctx.url, {path: '/', params: []});
    assert.deepStrictEqual(ctx.cookie, []);
  });

  it('no query params', async () => {
    assert.deepStrictEqual(_internal_.parseUrl('/hello'), {path: '/hello', params: []});
  });

  it('no cookie', async () => {
    assert.deepStrictEqual(_internal_.parseCookie(''), []);
  });

  it ('bad cookie', () =>{
    assert.deepStrictEqual(_internal_.parseCookie('a=; b; '), [['a', ''], ['b', ''], ['', '']]);
  });

  it ('bad params', () => {
    assert.deepStrictEqual(_internal_.parseUrl('?c&d=&'), {path: '/', params: [['c', ''], ['d', ''], ['', '']]});
  });
})
;
