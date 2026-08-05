/**
 * Provisions the User row (login identity) a new StudentProfile requires
 * (the schema's `userId` FK is required and unique). Deliberately narrow —
 * this is NOT the auth module's PasswordHasher port; a student's initial
 * account is created with a securely random, immediately-hashed password
 * that no one — including this system — ever has in plaintext. The
 * student cannot actually log in until a password-reset/invite flow exists
 * (FR-AUTH-06, still open per docs/planning/18_Open_Questions.md); this is
 * a known, deliberate limitation of this phase, not an oversight.
 */
export interface UserProvisioner {
  provisionStudentUser(email: string): Promise<{ userId: string }>;
}
