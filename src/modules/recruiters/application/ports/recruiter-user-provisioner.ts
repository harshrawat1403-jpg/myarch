/** Mirrors coordinators/application/ports/coordinator-user-provisioner.ts's reasoning — uses the shared temp-password primitive, not an unrecoverable random hash. */
export interface RecruiterUserProvisioner {
  provisionRecruiterUser(email: string): Promise<{ userId: string; tempPassword: string }>;

  /**
   * MYARCH Phase 1 (§2.4) — the self-signup counterpart: the applicant
   * chooses their own password (already hashed by the caller), so there is
   * no tempPassword to reveal and no mustChangePassword forcing. Creates
   * the User with isActive: false — login stays blocked (LoginUseCase's
   * own isActive check) until ApproveRecruiterUseCase flips it, which only
   * happens once both this and the RecruiterProfile's own explicit
   * approvalStatus: "PENDING" (SignupRecruiterUseCase sets this itself —
   * the schema's own default is APPROVED, correct for admin-created
   * accounts, so self-signup must override it) are satisfied.
   */
  provisionSelfSignupRecruiterUser(email: string, passwordHash: string): Promise<{ userId: string }>;
}
