import {serializableType} from "ts_agnostic";
import {ctxWsType} from "node_core";
import {value as flowInfoSql} from "./flow_info_sql";

export async function wsWfV1FlowInfo({db}: Pick<ctxWsType, 'db'>, params: serializableType): Promise<serializableType> {
  const stoken = params?.['stoken'];
  if (!stoken) {
    return {err: 'NX_STOKEN'};
  }
  return db(async (db) => {
    const r = await db.oneOrNone<{
      form_request_id: string,
      flow_name: string,
    }>(flowInfoSql, {stoken});

    if (!r) {
      return {err: 'NX_STOKEN'};
    }

    return {
      formRequestId: r.form_request_id,
      flowName: r.flow_name,
    };
  });
}