/** ReportMaintenanceIssueUseCase — notifies every active Secretary that a new issue needs acknowledgment. Re-declared per this module's own isolation convention. */
export interface SecretaryRecipientLookup {
  listActiveSecretaryUserIds(): Promise<string[]>;
}
