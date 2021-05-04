import {validateCtor} from "../../../validate_ctor";
import {wsFlowV1Ctor} from "../../ws_flow_v1_ctor";

function navHistoryToActionName(_navHistory: string[]): string {
  return 'test';
}

const validate = validateCtor(navHistoryToActionName, {}, {});
const formDataToStep = (formData) => ({'test': {'data': formData}});

export const wsFlowV1Test = wsFlowV1Ctor('test/v1', formDataToStep, validate);
