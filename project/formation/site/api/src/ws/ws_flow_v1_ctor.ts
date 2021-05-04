import {serializableType} from "ts_agnostic";
import {validateCtor} from "../validate_ctor";
import {settings} from "../settings";
import {contextNameIsValidCtor} from "./context_name_is_valid_ctor";
import {getDefaultStateCtor} from "../get_default_state_ctor";
import {commit} from "../commit";
import {woOpTemplateCtor} from "vue_workflow";

export const wsFlowV1Ctor = (
  ns: string,
  formDataToStep: (formData: serializableType) => Record<string, Record<string, serializableType>>,
  validate: ReturnType<typeof validateCtor>
) => {
  return woOpTemplateCtor({
    secret: settings.secret as string,
    contextNameIsValid: contextNameIsValidCtor(ns),
    getDefaultState: getDefaultStateCtor(formDataToStep),
    validate,
    commit,
  });
}