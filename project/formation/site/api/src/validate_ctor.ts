import {serializableType} from "ts_agnostic";
import {dbType} from "node_core";
import {woActionType} from "vue_workflow";

export const validateCtor = (
  navHistoryToActionName: (navHistory: string[]) => string,
  stepValidate: Record<string, (step: Record<string, serializableType>) => string>,
  stepFlatten: Record<string, (step: Record<string, serializableType>, params: Record<string, string>) => void>,
) => async (
  db: dbType,
  contextName: string,
  computed: Record<string, serializableType>,
  state: {
    navHistory: string[],
    step: Record<string, Record<string, serializableType>>,
  }
): Promise<{ action?: woActionType, err?: string }> => {
  const name = navHistoryToActionName(state.navHistory);
  const params: Record<string, string> = {};

  for (const step in state.step) {
    const err = stepValidate?.[step](state.step[step]);
    if (err) {
      return {err};
    }
    stepFlatten?.[step](state.step[step], params);
  }
  return {
    action: {
      name,
      params,
    }
  };
}