import crypto from "node:crypto";
import type { CoordinatorUserProvisioner } from "../../../src/modules/coordinators/application/ports/coordinator-user-provisioner";

export class FakeCoordinatorUserProvisioner implements CoordinatorUserProvisioner {
  readonly provisionedEmails: string[] = [];
  private readonly existingEmails = new Set<string>();

  /** Test-only: simulates an email that's already taken (triggers the unique-constraint-violation path). */
  seedExistingEmail(email: string): void {
    this.existingEmails.add(email.trim().toLowerCase());
  }

  async provisionCoordinatorUser(email: string): Promise<{ userId: string; tempPassword: string }> {
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
