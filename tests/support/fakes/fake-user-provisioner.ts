import crypto from "node:crypto";
import type { UserProvisioner } from "../../../src/modules/students/application/ports/user-provisioner";

export class FakeUserProvisioner implements UserProvisioner {
  readonly provisionedEmails: string[] = [];
  private readonly existingEmails = new Set<string>();

  seedExistingEmail(email: string): void {
    this.existingEmails.add(email.toLowerCase());
  }

  async provisionStudentUser(email: string): Promise<{ userId: string }> {
    const normalized = email.trim().toLowerCase();
    if (this.existingEmails.has(normalized)) {
      const err = new Error("Unique constraint failed on the fields: (`email`)");
      (err as unknown as { code: string }).code = "P2002";
      throw err;
    }
    this.existingEmails.add(normalized);
    this.provisionedEmails.push(normalized);
    return { userId: crypto.randomUUID() };
  }
}
