import { prisma } from "./prisma";
import { PrismaTokenBucketRateLimiter } from "./prisma-rate-limiter";

/**
 * V4.0 A2 (docs/planning/V4_0_PRD.md §18) — the shared rate-limiter
 * instances for the two of the five approved surfaces that already exist
 * pre-Phase-B (authentication, authenticated recruiter discovery). The
 * remaining three (public registration, public directory, public profile
 * access) are constructed here too once Phase B introduces those routes,
 * reusing this same PrismaTokenBucketRateLimiter — one shared primitive,
 * not a bespoke limiter per surface.
 */

// FR-AUTH-05/NFR-SEC-07: 10 attempts per 15-minute window, refilling
// continuously rather than resetting on a fixed boundary — same effective
// rate as the fixed-window limiter this replaces, keyed by email+IP at the
// call site (login.ts).
export const loginRateLimiter = new PrismaTokenBucketRateLimiter(prisma, {
  capacity: 10,
  refillRatePerSecond: 10 / (15 * 60),
});

// V4.0 §18 point 1: retrofits the pre-existing gap — /api/auth/refresh had
// no rate limiting at all. Keyed by IP only (no account is known until the
// refresh token itself is validated).
export const refreshRateLimiter = new PrismaTokenBucketRateLimiter(prisma, {
  capacity: 30,
  refillRatePerSecond: 30 / (15 * 60),
});

// V4.0 §18 point 1: authenticated recruiter discovery/search
// (/api/recruiters/students, /api/recruiters/dashboard) — even though
// authenticated, an abusive or compromised recruiter account should not be
// able to bulk-scrape the directory. 60/minute is generous for normal
// browsing/pagination but bounds scripted scraping.
export const recruiterDiscoveryRateLimiter = new PrismaTokenBucketRateLimiter(prisma, {
  capacity: 60,
  refillRatePerSecond: 1,
});

// V4.0 §18 point 1 / B1: public student registration (/api/registration) —
// abuse could create junk registration requests at volume. Deliberately
// tight (a real applicant submits once) and per-IP, matching the public,
// unauthenticated nature of the route.
export const publicRegistrationRateLimiter = new PrismaTokenBucketRateLimiter(prisma, {
  capacity: 5,
  refillRatePerSecond: 5 / (60 * 60),
});

// V4.0 §18 point 1 / B5: public student directory + public profile access
// (/api/public/directory[/[id]]) — anti-scraping. More generous than
// registration (a real visitor browses many cards; the goal is slowing
// automated enumeration of the full student list, not blocking normal use).
export const publicDirectoryRateLimiter = new PrismaTokenBucketRateLimiter(prisma, {
  capacity: 60,
  refillRatePerSecond: 1,
});

// MYARCH Phase 1 (§2.4) — self-signup (/api/recruiters/signup,
// /api/alumni/signup). Same shape as publicRegistrationRateLimiter — a real
// applicant signs up once, per-IP since no account exists yet to key on.
export const signupRateLimiter = new PrismaTokenBucketRateLimiter(prisma, {
  capacity: 5,
  refillRatePerSecond: 5 / (60 * 60),
});

// MYARCH Phase 1 — /api/auth/verify-email and /api/auth/reset-password
// (token-consuming). Tighter than login: the whole point is bounding
// brute-force guessing of another user's opaque token, not accommodating
// repeated legitimate use (each real token is single-use by design).
export const tokenConsumptionRateLimiter = new PrismaTokenBucketRateLimiter(prisma, {
  capacity: 10,
  refillRatePerSecond: 10 / (15 * 60),
});

// MYARCH Phase 1 — /api/auth/forgot-password and /api/auth/resend-verification.
// Deliberately tight and per-email+IP (mirrors loginRateLimiter's two-key
// shape) — both are cheap-to-call, no-account-required triggers for an
// outbound email, the exact kind of endpoint abuse would use to spam a
// third party's inbox.
export const emailTriggerRateLimiter = new PrismaTokenBucketRateLimiter(prisma, {
  capacity: 5,
  refillRatePerSecond: 5 / (15 * 60),
});
