import {serializableType} from "ts_agnostic";
import {dbType} from "node_core";
import {woStateType} from "vue_workflow";

export const getDefaultStateCtor = (
  formDataToStep: (formData: serializableType) => Record<string, Record<string, serializableType>>
) =>
  async (db: dbType, contextName: string, _computed: Record<string, serializableType>): Promise<woStateType> => {
    const [_, id] = contextName.split(':');

    const sql = 'SELECT form_data FROM client.form_request WHERE form_request_id=$(id);';
    const r = await db.one<{ form_data: serializableType }>(sql, {id});

    return {
      navHistory: ['init'],
      step: formDataToStep(r.form_data),
    };
  };