export function actionMapperCtor(
  ...mappings: {
    steps: string[], // subset of steps to look for
    action: string  // action to return if matched
  }[]
): (navHistory: string[]) => string | undefined {
  return function (navHistory: string[]) {
    for (const m of mappings) {
      if (m.steps.every(s => navHistory.includes(s))) {
        return m.action;
      }
    }
  };
}
