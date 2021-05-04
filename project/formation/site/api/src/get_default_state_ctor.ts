import {serializableType} from "ts_agnostic";
import {dbType} from "node_core";
import {woStateType} from "ts_workorder";

export const getDefaultStateCtor = (
  formDataToStep: (formData: serializableType) => Record<string, Record<string, serializableType>>
) =>
  async (db: dbType, contextName: string, _computed: Record<string, serializableType>): Promise<woStateType> => {
    const [_, id] = contextName.split(':');

    const sql = 'SELECT form_data, brand_name, jurisdiction_name, locale_name FROM client.form_request WHERE form_request_id=$(id);';
    const r = await db.one<{
      form_data: serializableType,
      brand_name: string,
      jurisdiction_name: string,
      locale_name: string
    }>(sql, {id});

    const step: Record<string, Record<string, serializableType>> = Object.assign(
      {
        init: {
          brand: r.brand_name,
          jurisdiction: r.jurisdiction_name,
          locale: r.locale_name,
        }
      },
      formDataToStep(r.form_data)
    );

    return {
      navHistory: ['init'],
      step,
    };
  };