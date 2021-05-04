import {woApiType} from './api';
import {serializableType} from 'ts_agnostic';
import {cloneDeep} from 'lodash';
import {ref, Ref} from '@vue/composition-api';
import {woMetadataType, woStateType} from "ts_workorder";

export type wfType = {
  prev(): Promise<void>;
  backTo(stepName: string): Promise<void>;
  next(stepName: string): Promise<void>;
  sign(stepName: string): Promise<void>;
  commit(stepName: string): Promise<void>;
  resume(contentHash?: string): Promise<void>;
  readonly hasPrev: boolean;
  readonly activeStep: Ref<string>;
  readonly computed: Ref<Record<string, serializableType>>;
  readonly step: Ref<Record<string, serializableType>>;
  readonly loading: Ref<boolean>;
};

export function wfCtor(
  woApi: woApiType,
  contextName: string,
  routeReplace: (contentHash: string) => Promise<void>,
  routePush: (contentHash: string) => Promise<void>,
  onError: (err: string) => Promise<void>,
): wfType {
  let woState: woStateType;
  let woMetadata: woMetadataType;
  const initStep = 'init';
  const activeStep = ref(initStep);
  const loading = ref(true);
  const step = ref<Record<string, serializableType>>({});
  const computed = ref<Record<string, serializableType>>({});

  function liftState(): void {
    step.value = woState?.step?.[activeStep.value] || {};
    computed.value = woMetadata?.computed || {};
  }

  async function update(op: 'UPDATE' | 'SIGN' | 'COMMIT', currentStepData: Record<string, serializableType>, destinationNavHistory: string[]): Promise<void> {
    const currentState = cloneDeep(woState) || {};
    currentState.step ||= {};
    currentState.step[activeStep.value] = currentStepData;
    const destinationState = cloneDeep(currentState);
    destinationState.navHistory = destinationNavHistory;

    const r = await woApi({
      op,
      contextName,
      states: [
        currentState,
        destinationState,
      ],
    });

    const res = r?.res;
    const s0 = res?.states?.[0];
    const s1 = res?.states?.[1];

    if (res && s0?.contentHash && s1?.contentHash) {
      await routeReplace(s0.contentHash);
      activeStep.value = s1.navHistory[s1.navHistory.length - 1];
      woMetadata = res.metadata;
      woState = s1;
      liftState();
      await routePush(s1.contentHash);
    } else {
      await onError(r?.err || 'UNKNOWN');
    }
  }

  async function withLoading(f: () => Promise<void>): Promise<void> {
    loading.value = true;
    try {
      await f();
    } catch (e) {
      console.error(e);
      await onError('UNKNOWN');
    } finally {
      loading.value = false;
    }
  }

  async function backTo(stepName: string): Promise<void> {
    return withLoading(async () => {
      const navHistory = woState?.navHistory || [initStep];
      let destinationNavHistory: string[];
      if (navHistory.length <= 1) {
        destinationNavHistory = [navHistory[0]];
      } else {
        let stepIndex = navHistory.indexOf(stepName);
        if (stepIndex < 0) {
          stepIndex = 0;
        }
        destinationNavHistory = navHistory.slice(0, stepIndex + 1);
      }
      await update('UPDATE' as const, step.value, destinationNavHistory);
    });
  }

  async function prev(): Promise<void> {
    return withLoading(async () => {
      const navHistory = woState?.navHistory || [initStep];
      let destinationNavHistory: string[];
      if (navHistory.length <= 1) {
        destinationNavHistory = [navHistory[0]];
      } else {
        destinationNavHistory = navHistory.slice(0, navHistory.length - 1);
      }
      await update('UPDATE' as const, step.value, destinationNavHistory);
    });
  }


  async function next(stepName: string): Promise<void> {
    return withLoading(async () => {
      const destinationNavHistory = woState?.navHistory ? [...woState.navHistory, stepName] : [initStep];
      await update('UPDATE' as const, step.value, destinationNavHistory);
    });
  }

  async function sign(stepName: string): Promise<void> {
    return withLoading(async () => {
      const destinationNavHistory = woState?.navHistory ? [...woState.navHistory, stepName] : [initStep];
      await update('SIGN' as const, step.value, destinationNavHistory);
    });
  }

  async function commit(stepName: string): Promise<void> {
    return withLoading(async () => {
      const destinationNavHistory = woState?.navHistory ? [...woState.navHistory, stepName] : [initStep];
      await update('COMMIT' as const, step.value, destinationNavHistory);
    });
  }

  async function resume(contentHash?: string): Promise<void> {
    return withLoading(async () => {
      const r = await woApi({
        op: 'RESUME' as const,
        contextName,
        contentHash,
      });

      const res = r?.res;
      const s0 = res?.states?.[0];

      if (res && s0?.contentHash) {
        await routeReplace(s0.contentHash);
        activeStep.value = s0.navHistory[s0.navHistory.length - 1];
        woMetadata = res.metadata;
        woState = s0;
        liftState();
      } else {
        await onError(r?.err || 'UNKNOWN');
      }
    });
  }

  return {
    backTo,
    prev,
    next,
    sign,
    commit,
    resume,
    activeStep,
    computed,
    step,
    loading,
    get hasPrev() {
      return woState?.navHistory?.length > 1;
    },
  };
}
