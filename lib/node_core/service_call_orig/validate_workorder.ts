import {pick} from 'lodash';
import {workorderEndpointCtxType} from './workorder_endpoint';

export function errorValidator(
  predicate: (
    ctx: workorderEndpointCtxType,
    stepStates: { [stepName: string]: any },
  ) => Promise<boolean>,
  errors: string[],
): (ctx: workorderEndpointCtxType, stepStates: { [stepName: string]: any }) => Promise<string[] |undefined> {
  return async function (ctx: workorderEndpointCtxType, stepStates: { [stepName: string]: any }): Promise<string[] |undefined> {
    if (!await predicate(ctx, stepStates)) return errors;
  };
}

export async function validateWorkorder(
  ctx: workorderEndpointCtxType,
  state: { meta: { navHistory: string[] }, step: { [stepName: string]: any } },
  actionMapping: (navHistory: string[]) => string | undefined,
  validatorByPageName: {
    [step: string]: (ctx: workorderEndpointCtxType, stepStates: { [stepName: string]: any }) => Promise<string[] | undefined>;
  },
): Promise<{ kind: 'errors', errors: string[] }
  | { kind: 'action', action: string, stepStates: { [stepName: string]: any } }
  | { kind: '' }> {
  const errors: string[] = [];
  const navHistory = state.meta.navHistory;
  const stepStates = pick(state.step, navHistory) as { [stepName: string]: any };

  for (const stepName of navHistory) {
    if (validatorByPageName[stepName]) {
      if (!state.step[stepName]) {
        errors.push(`noState/${stepName}`);
        continue;
      }
      const errs = await validatorByPageName[stepName](ctx, stepStates);
      if (errs) {
        errors.push(...errs);
      }
    }
  }

  if (errors.length !== 0) {
    return {kind: 'errors', errors};
  }

  const action = actionMapping(navHistory);
  if (action) {
    return {kind: 'action', action, stepStates};
  }
  return {kind: ''};
}
