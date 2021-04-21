import * as assert from 'assert';
import {serverSettingsType, userInfoType} from './../server.type';
import {sessionCreate, sessionVerify} from './db_session';
import {resolvedUndefined} from './../../../ts_agnostic/src/resolved';

describe('sessionCreate', () => {
  const setup = (dbResultMock: object) => {
    const dbProviderStub = (auditUser, callback, trackingTag) => {
      dbProviderStub.callCount++;
      callback(dbStub).catch(error => dbProviderStub.error = error);
      return resolvedUndefined;
    };
    dbProviderStub.callCount = 0;
    dbProviderStub.error = null;

    const dbOneStub = query => {
      dbOneStub.callCount++;
      return dbResultMock;
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

describe('sessionVerify', () => {
  const setup = (args: {
    dbResultMock: object | null,
    sessionIdMock: string,
    userMock: object | null,
    modeMock: 'client' | 'staff',
  }) => {
    const {dbResultMock, sessionIdMock, userMock, modeMock} = args

    const dbProviderStub = (auditUser, callback, trackingTag) => {
      dbProviderStub.callCount++;
      callback(dbStub);
      return resolvedUndefined;
    };
    dbProviderStub.callCount = 0;

    const dbOneOrNoneStub = query => {
      dbOneOrNoneStub.callCount++;
      return dbResultMock;
    };
    dbOneOrNoneStub.callCount = 0;

    const dbStub = () => resolvedUndefined;
    dbStub.oneOrNone = dbOneOrNoneStub;

    const ctxStub = {
      sessionId: sessionIdMock,
      session: {'': ''},
      dbProvider: dbProviderStub,
      user: null || <userInfoType>userMock,
      db: dbStub,
      settings: <serverSettingsType>{
        host: 'settings_host_mock',
        port: 'settings_port_mock',
        schema: 'settings_schema_mock',
        mode: modeMock,
        appUrl: 'settings_appUrl_mock',
        dbConnectionString: 'settings_dbConnectionString_mock',
      }
    }

    return {ctxStub, dbProviderStub, dbStub};
  };

  it('happy path - client', async () => {
    const {ctxStub, dbProviderStub, dbStub} = setup({
      dbResultMock: {
        login: 'db_result_login_mock',
        client_profile_id: 'db_result_client_profile_id_mock',
        federated_login_id: 'db_result_federated_login_id_mock',
        data: 'db_result_data_mock',
      },
      sessionIdMock: 'session_id_mock',
      userMock: {login: 'user_login_mock'},
      modeMock: 'client',
    });

    await sessionVerify(ctxStub);
    assert.strictEqual(dbProviderStub.callCount, 1);
    assert.strictEqual(dbStub.oneOrNone.callCount, 1);
    assert.strictEqual(ctxStub.user.login, 'db_result_login_mock');
    assert.strictEqual(ctxStub.user.clientProfileId, undefined);
    assert.strictEqual(ctxStub.user.federatedLoginId, undefined);
    assert.strictEqual(ctxStub.session, 'db_result_data_mock');
  });

  it('happy path - staff', async () => {
    const {ctxStub, dbProviderStub, dbStub} = setup({
      dbResultMock: {
        login: 'db_result_login_mock',
        client_profile_id: 'db_result_client_profile_id_mock',
        federated_login_id: 'db_result_federated_login_id_mock',
        data: 'db_result_data_mock',
      },
      sessionIdMock: 'session_id_mock',
      userMock: {login: 'user_login_mock'},
      modeMock: 'staff',
    });

    await sessionVerify(ctxStub);
    assert.strictEqual(dbProviderStub.callCount, 1);
    assert.strictEqual(dbStub.oneOrNone.callCount, 1);
    assert.strictEqual(ctxStub.user.login, 'db_result_login_mock');
    assert.strictEqual(ctxStub.user.clientProfileId, undefined);
    assert.strictEqual(ctxStub.user.federatedLoginId, undefined);
    assert.strictEqual(ctxStub.session, 'db_result_data_mock');
  });

  it('Session and user do not exist', async () => {
    const {ctxStub, dbProviderStub, dbStub} = setup({
      dbResultMock: {
        login: 'db_result_login_mock',
        client_profile_id: 'db_result_client_profile_id_mock',
        federated_login_id: 'db_result_federated_login_id_mock',
        data: 'db_result_data_mock',
      },
      sessionIdMock: '',
      userMock: null,
      modeMock: 'client',
    });

    await sessionVerify(ctxStub);
    assert.strictEqual(dbProviderStub.callCount, 2); // because sessionCreate called it too
    assert.strictEqual(dbStub.oneOrNone.callCount, 1);
    assert.strictEqual(ctxStub.user.login, 'db_result_login_mock');
    assert.strictEqual(ctxStub.user.clientProfileId, 'db_result_client_profile_id_mock');
    assert.strictEqual(ctxStub.user.federatedLoginId, 'db_result_federated_login_id_mock');
    assert.strictEqual(ctxStub.session, 'db_result_data_mock');
  });

  it('No result from DB', async () => {
    const {ctxStub, dbProviderStub, dbStub} = setup({
      dbResultMock: null,
      sessionIdMock: 'session_id_mock',
      userMock: {login: 'user_login_mock'},
      modeMock: 'client',
    });

    await sessionVerify(ctxStub);
    assert.strictEqual(dbProviderStub.callCount, 2); // // because sessionCreate called it too
    assert.strictEqual(dbStub.oneOrNone.callCount, 1);
    assert.strictEqual(ctxStub.user.login, 'user_login_mock');
    assert.strictEqual(ctxStub.user.clientProfileId, undefined);
    assert.strictEqual(ctxStub.user.federatedLoginId, undefined);
    assert.deepStrictEqual(ctxStub.session, {'': ''});
  });
});
