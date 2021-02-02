import {sandboxed} from '../../../../../project/staff/backend/src/test_helpers';
import * as assert from 'assert';
import {googleCtor} from './google';

describe(
  'google authentication',
  async () => {
    it(
      'google authentication execute(passport)',
      async () => {
        await sandboxed(
          async (sinon) => {
            const verify = sinon.stub();

            const settings = {
              googleAuthId: '1234',
              googleAuthSecret: '5678',
              projectUrl: 'http://localhost:3210/',
            };

            const subject = googleCtor(
              verify,
              settings,
            );


            const passportStub = {use: sinon.stub()};

            subject(passportStub);

            assert(passportStub.use.called);
          });
      },
    );
  },
);
