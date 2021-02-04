import * as assert from 'assert';
import * as sinon from 'sinon';
import {deserializeUser, serializeUser} from './index';
import {authInstallerCtor} from './index';
import {authCtor} from './index';

describe(
  'passport auth middleware',
  () => {
    const user = {
      email: 'email@example.test',
      id: '6c84fb90-12c4-11e1-840d-7b25c5ee775a',
    };

    it(
      'serializeUser',
      () => {
        const done = sinon.stub();
        serializeUser(
          user,
          done,
        );
        assert(
          done.calledWith(
            null,
            user,
          ),
          'Calls done with the user data.',
        );
      },
    );

    it(
      'deserializeUser',
      () => {
        const done = sinon.stub();
        deserializeUser(
          user,
          done,
        );
        assert(
          done.calledWithExactly(
            null,
            user,
          ),
          'Calls done with the user data if it has an e-mail.',
        );

        done.reset();
        deserializeUser(
          {},
          done,
        );
        assert(
          done.calledWithExactly(
            null,
            null,
          ),
          'Calls done without the user data if it does not have an e-mail.',
        );
      },
    );

    it(
      'passport auth installer',
      async () => {
        const installer = sinon.stub();
        const passportStub = {
          authenticate: sinon.stub(),
          use: sinon.stub(),
          serializeUser: sinon.stub(),
          deserializeUser: sinon.stub(),
        };
        const settingsStub = {googleAuthId: 'x', googleAuthSecret: 'y', projectUrl: 'z'};

        await authInstallerCtor(installer)(passportStub, settingsStub);

        assert(
          installer.calledWith(passportStub),
          'installers are called with the passport object',
        );
        assert(
          passportStub.serializeUser.calledWith(serializeUser),
          'serializeUser is configured for passport',
        );
        assert(
          passportStub.deserializeUser.calledWith(deserializeUser),
          'deserializeUser is configured for passport',
        );
      },
    );

    it('middleware handler for /*/auth/*', async () => {
      const passportStub = {
        authenticate: sinon.stub(),
        use: sinon.stub(),
        serializeUser: sinon.stub(),
        deserializeUser: sinon.stub(),
      };
      const authenticateStub = sinon.stub();
      passportStub.authenticate.returns(authenticateStub);

      const nextStub = sinon.stub();
      const middleware = authCtor(passportStub);

      await middleware({url: '/api/nope/'}, nextStub);
      sinon.assert.notCalled(passportStub.authenticate);
      sinon.assert.called(nextStub);

      nextStub.reset();

      const ctx = {url: '/api/auth/'};
      await middleware(ctx, nextStub);
      sinon.assert.called(passportStub.authenticate);
      sinon.assert.calledWith(authenticateStub, ctx, nextStub);
      sinon.assert.notCalled(nextStub);
    });
  },
);
