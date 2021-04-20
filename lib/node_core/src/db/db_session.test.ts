import * as assert from 'assert';
import {sessionCreate} from './db_session';
import {resolvedUndefined} from './../../../ts_agnostic/src/resolved';

describe('sessionCreate', () => {
  const setup = (sessionMock: object) => {
    const dbProviderStub = (auditUser, callback, trackingTag) => {
      dbProviderStub.callCount++;
      callback(dbStub).catch(error => dbProviderStub.error = error);
      return resolvedUndefined;
    };
    dbProviderStub.callCount = 0;
    dbProviderStub.error = null;

    const dbOneStub = query => {
      dbOneStub.callCount++;
      return sessionMock;
    };
    dbOneStub.callCount = 0;

    const dbStub = () => resolvedUndefined;
    dbStub.one = dbOneStub;
    
    const ctxStub = {
      sessionId: '',
      session: {'': ''},
      dbProvider: dbProviderStub,
      db: dbStub,
    }

    return {ctxStub, dbProviderStub, dbStub};
  }

  it('happy path', async () => {
    const {ctxStub, dbProviderStub, dbStub} = setup({session_id: 'session_id_mock'});
    
    await sessionCreate(ctxStub);
    assert.strictEqual(dbProviderStub.callCount, 1);
    assert.strictEqual(dbStub.one.callCount, 1);
    assert.strictEqual(ctxStub.sessionId, 'session_id_mock');
    assert.deepStrictEqual(ctxStub.session, {}); // {} from hardcoded value in subject
    assert.strictEqual(dbProviderStub.error, null);
  });

  it('error: could not create a session', async () => {
    const {ctxStub, dbProviderStub, dbStub} = setup({});

    await sessionCreate(ctxStub);
    assert.strictEqual(dbProviderStub.callCount, 1);
    assert.strictEqual(dbStub.one.callCount, 1);
    assert.strictEqual(ctxStub.sessionId, '');
    assert.deepStrictEqual(ctxStub.session, {'': ''});
    assert.strictEqual(dbProviderStub.error.message, 'could not create a new session.');
  });
});
