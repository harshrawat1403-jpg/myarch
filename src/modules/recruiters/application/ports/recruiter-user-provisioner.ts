/** Mirrors coordinators/application/ports/coordinator-user-provisioner.ts's reasoning — uses the shared temp-password primitive, not an unrecoverable random hash. */
export interface RecruiterUserProvisioner {
  provisionRecruiterUser(email: string): Promise<{ userId: string; tempPassword: string }>;
}
