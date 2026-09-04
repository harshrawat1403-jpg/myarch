import type { Role } from "@/modules/auth";

export interface ReviewerAccount {
  readonly userId: string;
  readonly role: Role;
  readonly isActive: boolean;
}

export interface ReviewerLookup {
  findByUserId(userId: string): Promise<ReviewerAccount | null>;
}

export interface SecretaryRecipientLookup {
  listActiveSecretaryUserIds(): Promise<readonly string[]>;
}

