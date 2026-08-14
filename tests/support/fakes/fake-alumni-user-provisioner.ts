import crypto from "node:crypto";
import type { AlumniUserProvisioner } from "../../../src/modules/alumni/application/ports/alumni-user-provisioner";

export class FakeAlumniUserProvisioner implements AlumniUserProvisioner {
  readonly provisionedEmails: string[] = [];
  private readonly existingEmails = new Set<string>();

  seedExistingEmail(email: string): void {
    this.existingEmails.add(email.trim().toLowerCase());
  }

  async provisionSelfSignupAlumniUser(email: string, _passwordHash: string): Promise<{ userId: string }> {
    const normalized = email.trim().toLowerCase();
    if (this.existingEmails.has(normalized)) {
      const err = new Error("Unique constraint failed") as Error & { code: string };
      err.code = "P2002";
      throw err;
    }
    this.provisionedEmails.push(normalized);
    return { userId: crypto.randomUUID() };
  }
}
