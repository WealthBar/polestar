export type vFormType = undefined | (HTMLFormElement & {
  validate(): boolean;
  resetValidation(): void;
});
