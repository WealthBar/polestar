import {ref} from "@vue/composition-api";

// return type is inferred correctly.
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const callTrackerCtor = (
  setTimeout: (f: () => void, ms: number) => void,
  delayTimeMilliseconds: number
) => {
  const callsOutstanding = ref(0);
  const tracker = async <T>(f: () => Promise<T>): Promise<T> => {
    ++callsOutstanding.value;

    try {
      return await f();
    } catch (e) {
      console.error(e);
      throw e;
    } finally {
      // delay the decrement to help smooth out 1->0->1->0->1->0 flicker caused
      // by updates that are watching $wsOutstanding and updating UI elements
      if (callsOutstanding.value === 1) {
        setTimeout(() => --callsOutstanding.value, delayTimeMilliseconds);
      } else {
        --callsOutstanding.value;
      }
    }
  }
  tracker.callsOutstanding = callsOutstanding;
  return tracker;
}