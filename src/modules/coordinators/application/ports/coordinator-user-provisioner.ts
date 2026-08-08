/**
 * Provisions the User row a new CoordinatorProfile requires. Unlike
 * students/application/ports/user-provisioner.ts's provisionStudentUser
 * (an unrecoverable random password — a known, deliberate Phase 1 gap),
 * this uses the shared temp-password primitive
 * (auth/domain/temp-password.ts's generateTempPassword) and returns the
 * plaintext temp password once, for the caller's reveal-once UI — this IS
 * the fix that gap's own doc comment anticipates, applied here since
 * Coordinator accounts are the first ones this phase creates through the
 * application, not a seed script.
 */
export interface CoordinatorUserProvisioner {
  provisionCoordinatorUser(email: string): Promise<{ userId: string; tempPassword: string }>;
}
