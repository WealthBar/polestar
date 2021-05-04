import {dbType} from "node_core";
import {woActionType} from "ts_workorder";

export const commit = async (db: dbType, contextName: string, action: woActionType): Promise<void> => {
  const [_, id] = contextName.split(':');
  const sql = `
      INSERT INTO
          client.form_result (form_request_id, form_data)
      VALUES
          ($(id), $(action))
      ON CONFLICT (form_request_id)
          DO UPDATE SET
          form_data=excluded.form_data
      ;`;
  await db.none(sql, {id, action});
};
