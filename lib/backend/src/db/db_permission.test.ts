import * as assert from 'assert';
import * as sinon from 'sinon';
import {dbPermissionCtor} from './db_permission';
import {value as fetchUserPermissions} from './db_permission_fetch_user_permissions_sql';
import {dbProviderStub} from './db_provider_stub';

describe('dbPermission', () => {
  const userId = '00059f5b-fd4c-459c-ad0f-31c3a4bf5688';

  it('queries the db correctly', async () => {
    const {dbProvider, db} = dbProviderStub(sinon);
    const subject = dbPermissionCtor(dbProvider);

    db.any.resolves([]);

    const result = await subject(
      userId,
      '-',
    );

    sinon.assert.calledWithExactly(db.any, fetchUserPermissions, {userId});
    assert.deepStrictEqual(result, {});
  });

  it('computes permissions correctly', async () => {
    const {dbProvider, db} = dbProviderStub(sinon);
    const subject = dbPermissionCtor(dbProvider);

    db.any.onCall(0).resolves([
      {permission_name: 'W', relation_type: 'add'},
      {permission_name: 'X', relation_type: 'add'},
      {permission_name: 'Y', relation_type: 'add_grant'},
      {permission_name: 'Z', relation_type: 'remove'},
      {permission_name: 'X', relation_type: 'remove'},
      {permission_name: 'Y', relation_type: 'remove'},
      {permission_name: 'Z', relation_type: 'add'},
      {permission_name: 'Q', relation_type: 'add_grant'},
      {permission_name: 'A', relation_type: 'invalid'},
    ]);

    const result = await subject(
      userId,
      '-'
    );

    sinon.assert.calledWithExactly(db.any, fetchUserPermissions, {userId});

    assert.deepStrictEqual(result, {'Q': true, '+Q': true, 'Z': true, 'W': true});
  });
});
