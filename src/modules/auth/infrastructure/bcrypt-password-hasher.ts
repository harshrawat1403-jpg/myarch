import bcrypt from "bcryptjs";
import type { PasswordHasher } from "../application/ports/password-hasher";

const MIN_COST_FACTOR = 12;

/**
 * bcrypt-backed password hashing, cost factor 12+ enforced at construction
 * (docs/security/14_Security_Architecture.md — non-negotiable, not a target).
 */
export class BcryptPasswordHasher implements PasswordHasher {
  readonly dummyHash: string;
  private readonly costFactor: number;

  constructor(costFactor: number) {
    if (costFactor < MIN_COST_FACTOR) {
      throw new Error(
        `bcrypt cost factor must be >= ${MIN_COST_FACTOR} (docs/security/14_Security_Architecture.md); received ${costFactor}`,
      );
    }
    this.costFactor = costFactor;
    // Computed once at construction, at the same cost as real hashes, so
    // timing-safety comparisons (see LoginUseCase) cost the same either way.
    this.dummyHash = bcrypt.hashSync("tnparch-timing-safety-placeholder", this.costFactor);
  }

  async hash(plaintext: string): Promise<string> {
    return bcrypt.hash(plaintext, this.costFactor);
  }

  async compare(plaintext: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plaintext, hash);
  }
}
