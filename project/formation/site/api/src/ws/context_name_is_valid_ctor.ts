import {dbType} from "node_core";
import {resolvedFalse} from "ts_agnostic";

export const contextNameIsValidCtor = (ns: string) =>
  async (db: dbType, contextName: string): Promise<boolean> => {
    const m = contextName?.match(/^(?<ns>[^:]+):(?<id>[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i);
    const groups = m?.groups;

    const id = groups?.['id'];
    if (!id || groups?.['ns'] !== ns) {
      return resolvedFalse;
    }
    const sql = 'SELECT TRUE FROM client.form_request WHERE form_request_id=$(id);';
    return !!(await db.oneOrNone(sql, {id}));
  };