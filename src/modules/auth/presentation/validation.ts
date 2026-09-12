import { z } from "zod";
import { isStrongEnoughPassword, PASSWORD_STRENGTH_MESSAGE } from "../domain/password-policy";

/**
 * Server-side floor for any new password (self-service change or the
 * client-side strength meter's own minimum) — at least 10 characters and at
 * least 3 of {lowercase, uppercase, digit, symbol}. The meter itself
 * (src/lib/password-strength.ts) is client-only feedback; this is the one
 * place that floor is actually enforced.
 */
export const ChangePasswordRequestSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().refine(isStrongEnoughPassword, {
      message: PASSWORD_STRENGTH_MESSAGE,
    }),
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    message: "New password must be different from your current password",
    path: ["newPassword"],
  });

/** MYARCH Phase 1 — always accepted regardless of whether the email exists (ForgotPasswordUseCase's own anti-enumeration behavior handles that, not this schema). */
export const ForgotPasswordRequestSchema = z.object({
  email: z.string().trim().email(),
});

export const ResetPasswordRequestSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().refine(isStrongEnoughPassword, {
    message: PASSWORD_STRENGTH_MESSAGE,
  }),
});

/** MYARCH Phase 1 — signup's own password floor, identical policy, same reuse as ChangePasswordRequestSchema/ResetPasswordRequestSchema above. */
export const SignupPasswordSchema = z.string().refine(isStrongEnoughPassword, {
  message: PASSWORD_STRENGTH_MESSAGE,
});

export const VerifyEmailRequestSchema = z.object({
  token: z.string().min(1),
});

export const ResendVerificationRequestSchema = z.object({
  email: z.string().trim().email(),
});

export const UpdateProfileRequestSchema = z
  .object({
    fullName: z.string().trim().min(1).max(200).optional(),
    email: z.string().trim().email().optional(),
    /** Required only when `email` is present — checked in the use case, not here, since that's a cross-field business rule. */
    currentPassword: z.string().min(1).optional(),
  })
  .refine((value) => value.fullName !== undefined || value.email !== undefined, {
    message: "At least one field must be provided",
  });
