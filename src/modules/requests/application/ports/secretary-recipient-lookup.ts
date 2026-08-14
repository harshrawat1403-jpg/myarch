/** SubmitRequestUseCase — notifies every active Secretary that a new request needs review. Re-declared per this module's own isolation convention. */
export interface SecretaryRecipientLookup {
  listActiveSecretaryUserIds(): Promise<string[]>;
}
