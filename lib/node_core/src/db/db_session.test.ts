import * as sinon from 'sinon';
import {sessionCreate} from './db_session';

describe('sessionCreate', () => {
  it('basics', () => {
    const ctxStub = {
      sessionId: '',
      session: {'': ''},
      dbProvider: sinon.stub().returns('return from dbProvider'),
      db: sinon.stub().resolves('resolution from db'),
    }

    sessionCreate(ctxStub);
    sinon.assert.callCount(ctxStub.dbProvider, 1);
  });
});