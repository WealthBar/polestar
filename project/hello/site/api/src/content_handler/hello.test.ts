import {helloHandler} from './hello';
import * as sinon from 'sinon';
import * as assert from 'assert';

describe('hello', () => {
  it('path is /hello', async () => {
    const ctx: any = {
      sessionId: '',
      req: {},
      res: {
        setHeader: sinon.stub(),
        end: sinon.stub(),
      },
      url: {path: '/hello', params: []},
      session: {},
      cookie: [],
    };

    await helloHandler(ctx);
    assert.strictEqual(ctx.res.statusCode, 200);
    sinon.assert.calledOnceWithExactly(ctx.res.setHeader, 'Content-Type', 'text/plain');
    sinon.assert.calledOnceWithExactly(ctx.res.end, 'Hello');
  });

  it('path is not /hello', async () => {
    const ctx: any = {
      sessionId: '',
      req: {},
      res: {
        setHeader: sinon.stub(),
        end: sinon.stub(),
      },
      url: {path: '/helo', params: []},
      session: {},
      cookie: [],
    };

    await helloHandler(ctx);

    assert.strictEqual(ctx.res.statusCode, undefined);
    sinon.assert.notCalled(ctx.res.setHeader);
    sinon.assert.notCalled(ctx.res.end);
  });
});
