import {dbType} from "./db/db_provider";
import {DateTime, Duration} from "luxon";

export type dbProviderWithUserBoundType = <T>(callback: (db: dbType) => Promise<T>, trackingTag: string) => Promise<T|undefined>;

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
