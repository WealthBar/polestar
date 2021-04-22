import * as sinon from 'sinon';
import * as assert from 'assert';
import {permissionResolve} from './permission_resolve'

describe('permissionResolve', () => {
  it('adds a permission', () => {
    const result = permissionResolve([
      {relation_type: 'add', permission_name: 'permissionA'},
    ]);

    assert.deepStrictEqual(result, {permissionA: true});
  });

  it('removes a permission', () => {
    const result = permissionResolve([
      {relation_type: 'remove', permission_name: 'permissionB'},
    ]);

    assert.deepStrictEqual(result, {});
  });

  it('grants a permission', () => {
    const result = permissionResolve([
      {relation_type: 'add_grant', permission_name: 'permissionC'},
    ]);

    assert.deepStrictEqual(result, { permissionC: true, '+permissionC': true });
  });

  it('handles an array of permissions', () => {
    const result = permissionResolve([
      {relation_type: 'add', permission_name: 'permissionA'},
      {relation_type: 'remove', permission_name: 'permissionB'},
      {relation_type: 'add_grant', permission_name: 'permissionC'},
    ]);

    assert.deepStrictEqual(result, {
      permissionA: true,
      permissionC: true,
      '+permissionC': true,
    });
  });

  it('errors if an unrocognized permission is passed', () => {
    const result = permissionResolve([
      {relation_type: 'foo', permission_name: 'permissionA'},
    ]);

    assert.deepStrictEqual(result, {});
  });
});
