import type { ExistingAccountLookup } from "../../../src/modules/registration/application/ports/existing-account-lookup";

export class FakeExistingAccountLookup implements ExistingAccountLookup {
  private readonly emails = new Set<string>();
  private readonly rollNumbers = new Set<string>();

  seedEmail(email: string): void {
    this.emails.add(email.toLowerCase());
  }

  seedRollNumber(rollNumber: string): void {
    this.rollNumbers.add(rollNumber.toLowerCase());
  }

  async emailInUse(email: string): Promise<boolean> {
    return this.emails.has(email.toLowerCase());
  }

  async rollNumberInUse(rollNumber: string): Promise<boolean> {
    return this.rollNumbers.has(rollNumber.toLowerCase());
  }
}
