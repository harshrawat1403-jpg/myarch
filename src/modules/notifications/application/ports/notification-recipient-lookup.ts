/**
 * Minimal, read-only port — same pattern as profiles/application/ports/
 * student-lookup.ts: a shared User field read directly rather than
 * importing another module's application layer.
 */
export interface NotificationRecipientLookup {
  findEmailByUserId(userId: string): Promise<string | null>;
}
