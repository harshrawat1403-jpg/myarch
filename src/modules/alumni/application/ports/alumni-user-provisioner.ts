/**
 * MYARCH Phase 1 (§2.4) — self-signup counterpart, mirroring
 * recruiters/application/ports/recruiter-user-provisioner.ts's
 * provisionSelfSignupRecruiterUser exactly: the applicant chooses their own
 * password (already hashed by the caller), created with isActive: false so
 * login stays blocked (LoginUseCase's own isActive check) until
 * ApproveAlumniUseCase flips it.
 */
export interface AlumniUserProvisioner {
  provisionSelfSignupAlumniUser(email: string, passwordHash: string): Promise<{ userId: string }>;
}
