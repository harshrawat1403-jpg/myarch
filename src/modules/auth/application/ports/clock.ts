/**
 * Abstracts "now" so use cases never call `new Date()` directly — keeps
 * expiry/rotation logic deterministic and testable without waiting on real
 * time or mocking global Date.
 */
export interface Clock {
  now(): Date;
}
