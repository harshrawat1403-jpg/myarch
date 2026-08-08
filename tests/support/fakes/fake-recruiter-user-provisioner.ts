import crypto from "node:crypto";
import type { RecruiterUserProvisioner } from "../../../src/modules/recruiters/application/ports/recruiter-user-provisioner";

export class FakeRecruiterUserProvisioner implements RecruiterUserProvisioner {
  readonly provisionedEmails: string[] = [];
  private readonly existingEmails = new Set<string>();

  seedExistingEmail(email: string): void {
    this.existingEmails.add(email.trim().toLowerCase());
  }

  async provisionRecruiterUser(email: string): Promise<{ userId: string; tempPassword: string }> {
    const normalized = email.trim().toLowerCase();
    if (this.existingEmails.has(normalized)) {
      const err = new Error("Unique constraint failed") as Error & { code: string };
      err.code = "P2002";
      throw err;
    }
    this.provisionedEmails.push(normalized);
    return { userId: crypto.randomUUID(), tempPassword: crypto.randomBytes(9).toString("base64url") };
  }
}
