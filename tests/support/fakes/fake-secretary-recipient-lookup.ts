import type { SecretaryRecipientLookup } from "../../../src/modules/recruiters/application/ports/secretary-recipient-lookup";

export class FakeSecretaryRecipientLookup implements SecretaryRecipientLookup {
  constructor(private userIds: readonly string[] = []) {}

  seed(userIds: readonly string[]): void {
    this.userIds = userIds;
  }

  async listActiveSecretaryUserIds(): Promise<string[]> {
    return [...this.userIds];
  }
}
