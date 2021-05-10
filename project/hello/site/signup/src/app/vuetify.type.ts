export type vFormType = undefined | (HTMLFormElement & {
  validate(): boolean;
  resetValidation(): void;
});

export type vFormField = undefined | {
  hasError: boolean;
};
