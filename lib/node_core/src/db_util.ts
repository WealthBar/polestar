import {dbProviderType, dbType} from './db/db_provider';
import {DateTime, Duration} from 'luxon';

export type dbProviderCtx = <T>(callback: (db: dbType) => Promise<T>) => Promise<T|undefined>;

export function toDbProvideCtx(auditUser: string, trackingTag: string, dbProvider: dbProviderType): dbProviderCtx {
  return function <T>(callback: (db: dbType) => Promise<T>): Promise<T|undefined> {
    return dbProvider(auditUser, callback, trackingTag);
  }
}

export function parseDbTimeStampTZ(datetime?: string): DateTime | undefined {
  if (!datetime) {
    return undefined;
  }
  try {
    return DateTime.fromISO(datetime);
  } catch {
    return undefined;
  }
}

export function parseDbMilliseconds(ms?: string): Duration | undefined {
  if (!ms) {
    return undefined;
  }
  try {
    return Duration.fromMillis(+ms);
  } catch {
    return undefined;
  }
}
