import * as assert from 'assert';
import * as sinon from 'sinon';
import {sessionCtor, sessionSettingsType} from './session';

function getSut(settings: sessionSettingsType) {
  const dbSession = {
    create: sinon.stub() as any,
    verify: sinon.stub() as any,
    update: sinon.stub() as any,
    delete: sinon.stub() as any,
    expire: sinon.stub() as any,
  };

  const sut = sessionCtor(dbSession, settings);
  const ctx: any = {
    cookies: {
      get: sinon.stub(),
      set: sinon.stub(),
    },
  };

  return {sut, dbSession, ctx};
}

describe('session', async () => {
  it('execute with no existing session', async () => {
    const {sut, dbSession, ctx} = getSut({});

    dbSession.create.resolves({data: {some: 'data'}});

    const next = sinon.stub();

    await sut(ctx, next);

    assert(next.called);
    assert(dbSession.create.called);
    assert.strictEqual(ctx.sessionInfo.data.some, 'data');
    assert.strictEqual(ctx.session.some, 'data');
  });

  it('execute with cookie fails to set', async () => {
    const settings = {sessionCookieName: 'sescook'};
    const {sut, dbSession, ctx} = getSut(settings);

    dbSession.create.resolves({data: {some: 'data'}});

    ctx.cookies.get.returns('00055d6c5f9ef0da1ddf53e9148f622bffa112496a98abaa197106fdec4befb6');
    dbSession.verify.resolves(undefined);
    const next = sinon.stub();

    ctx.cookies.set.throws(new Error('nope.'));

    try {
      await sut(ctx, next);
      assert.fail('should have thrown an error');
    } catch (e) {
      assert.ok('did throw an error');
    }
  });

  it('execute with invalid session',async () => {
    const {sut, dbSession, ctx} = getSut({sessionCookieName: 'sescook'});

    dbSession.create.resolves({data: {some: 'data'}});

    ctx.cookies.get.returns('00055d6c5f9ef0da1ddf53e9148f622bffa112496a98abaa197106fdec4befb6');
    dbSession.verify.resolves(undefined);
    const next = sinon.stub();

    await sut(ctx, next);

    assert(next.called);
    assert(dbSession.verify.called);
    assert(dbSession.create.called);
    assert(ctx.cookies.get.calledWith('sescook'));
    assert.strictEqual(ctx.sessionInfo.data.some, 'data');
    assert.strictEqual(ctx.session.some, 'data');
  });

  it('execute with valid session', async () => {
    const {sut, dbSession} = getSut({sessionCookieName: 'sescook'});

    const ctx: any = {
      cookies: {
        get: sinon.stub(),
        set: sinon.stub(),
      },
    };

    ctx.cookies.get.returns('00055d6c5f9ef0da1ddf53e9148f622bffa112496a98abaa197106fdec4befb6');
    dbSession.verify.resolves({data: {some: 'data'}});
    const next = sinon.stub();

    await sut(ctx, next);

    assert(next.called);
    assert(dbSession.verify.called);
    assert(!dbSession.create.called);
    assert(ctx.cookies.get.calledWith('sescook'));
    assert.strictEqual(ctx.sessionInfo.data.some, 'data');
    assert.strictEqual(ctx.session.some, 'data');
  });
});
