export interface PasswordHasher {
  hash(plaintext: string): Promise<string>;
  compare(plaintext: string, hash: string): Promise<boolean>;

  /**
   * A precomputed, valid-format hash with no corresponding real password.
   * Used only so that `compare()` is always executed — with comparable
   * computational cost — even when no matching user record exists, keeping
   * login response timing from revealing whether an email is registered.
   */
  readonly dummyHash: string;
}
