import {value as fetchUserPermissions} from './db_permission_fetch_user_permissions_sql';
import {dbProviderType, dbType} from './db_provider';

import debugCtor = require('debug');

const debug = debugCtor(
  'db:permission',
);

const critical = debugCtor('critical:db:permission');

export type permissionsType = Record<string, boolean>;

export function resolvePermissions(userPermissions: { permission_name: string, relation_type: string }[]): permissionsType {
  const permissions: permissionsType = {};

  for (const {permission_name: permissionName, relation_type: relType} of userPermissions) {
    debug(`${relType} ${permissionName}`);
    switch (relType) {
      case 'add':
        permissions[permissionName] = true;
        break;
      case 'remove':
        delete permissions[permissionName];
        delete permissions[`+${permissionName}`];
        break;
      case 'add_grant':
        permissions[permissionName] = true;
        permissions[`+${permissionName}`] = true;
        break;
      default:
        critical(`${relType} is unknown`);
        break;
    }
  }
  return permissions;
}

export async function getUserPermissions(db: dbType, userId: string): Promise<{ permission_name: string, relation_type: string }[]> {
  return db.any(fetchUserPermissions, {userId});
}

export type dbPermissionType = (userId: string, trackingTag: string) => Promise<permissionsType | undefined>;

export function dbPermissionCtor(dbProvider: dbProviderType): dbPermissionType {
  async function dbPermission(userId: string, trackingTag: string): Promise<permissionsType | undefined> {
    return dbProvider(userId, async (db: dbType) => {
      const userPermissions = await getUserPermissions(db, userId);
      return resolvePermissions(userPermissions);
    }, trackingTag);
  }

  return dbPermission;
}
