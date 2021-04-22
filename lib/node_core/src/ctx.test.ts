import {_internal_, ctxCtor, ctxSetDb, ctxBody} from './ctx';
import * as assert from 'assert';
import {ctxType, serverSettingsType} from './server.type';
import {dbProviderStub} from './db';
import * as sinon from 'sinon';
import {resolvedUndefined} from 'ts_agnostic';

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
      connection: { remoteAddress: 'aoeu' },
    };
    const res: any = {};
    const db = dbProviderStub(sinon);
    const ctx = ctxCtor(req, res, db.dbProvider, {} as any);
    commonChecks(ctx, res, req);
    assert.deepStrictEqual(ctx.url, {path: '/hello', params: [['a', '1'], ['b', '2']]});
    assert.deepStrictEqual(ctx.cookie, [['c', '3'], ['d', '4']]);
    assert.strictEqual(ctx.remoteAddress, 'aoeu');
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

  it('bad cookie', () => {
    assert.deepStrictEqual(_internal_.parseCookie('a=; b; '), [['a', ''], ['b', ''], ['', '']]);
  });

  it('bad params', () => {
    assert.deepStrictEqual(_internal_.parseUrl('?c&d=&'), {path: '/', params: [['c', ''], ['d', ''], ['', '']]});
  });
});

describe('ctxBody', () => {
  it('resolves true if there is a body', async () => {
    const ctxStub = {
      body: "Shredder!! Why haven't you completed my new body!?",
      req: <any>{},
      res: <any>{},
    }

    assert.strictEqual(await ctxBody(ctxStub), true);
  });

  it('resolves false if there is no body and the request is not a POST', async () => {
    const ctxStub = {
      req: <any>{},
      res: <any>{
        setHeader: sinon.stub(),
        end: sinon.stub(),
      },
    }

    assert.strictEqual(await ctxBody(ctxStub), false);
    assert.strictEqual(ctxStub.res.statusCode, 405);
    sinon.assert.calledOnceWithExactly(ctxStub.res.setHeader, 'Content-Type', 'text/plain');
    sinon.assert.calledOnceWithExactly(ctxStub.res.end);
  });

  it('returns true if there is no body, the request is a POST, and the request length is acceptable', async () => {
    const onStub = (step, callback) => {
      if (step === 'data') {
        callback('chunk_mock');
      } else {
        callback();
      }

      onStub.callCount++;
    }
    onStub.callCount = 0

    const ctxStub = {
      body: undefined,
      req: <any>{
        on: onStub,
        method: 'POST',
      },
      res: <any>{
        setHeader: sinon.stub(),
        end: sinon.stub(),
      },
    }

    assert.strictEqual(await ctxBody(ctxStub), true);
    assert.strictEqual(ctxStub.req.on.callCount, 2);
    assert.strictEqual(ctxStub.body, 'chunk_mock');
  });

  it('returns false if there is no body and the request is a POST, but the request is too long', async () => {
    const onStub = (step, callback) => {
      if (step === 'data') {
        callback('large_chunk_mock');
      } else {
        callback();
      }

      onStub.callCount++;
    }
    onStub.callCount = 0

    const ctxStub = {
      req: <any>{
        on: onStub,
        method: 'POST',
      },
      res: <any>{
        setHeader: sinon.stub(),
        end: sinon.stub(),
      },
    }

    assert.strictEqual(await ctxBody(ctxStub, 10), false);
    assert.strictEqual(ctxStub.req.on.callCount, 2);
    assert.strictEqual(ctxStub.res.statusCode, 413);
    sinon.assert.calledOnceWithExactly(ctxStub.res.setHeader, 'Content-Type', 'text/plain');
    sinon.assert.calledOnceWithExactly(ctxStub.res.end);
  });
});
