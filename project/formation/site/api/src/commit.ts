import {dbType} from "node_core";
import {woActionType} from "vue_workflow";

export const commit = async (db: dbType, contextName: string, action: woActionType): Promise<void> => {
  const [_, id] = contextName.split(':');
  const sql = 'INSERT INTO client.form_result (form_request_id, form_data) VALUES ($(id),$(action));';
  await db.none(sql, {id, action});
};