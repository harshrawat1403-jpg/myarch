"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import type { RegistrationRequestRecord } from "@/modules/registration";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { DataLabel } from "@/components/ui/typography";
import { useToast } from "@/components/ui/toast";
import { RevealPasswordModal } from "@/components/ui/reveal-password-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

function statusBadgeVariant(status: RegistrationRequestRecord["status"]): BadgeVariant {
  if (status === "APPROVED") return "approved";
  if (status === "REJECTED") return "rejected";
  if (status === "NEEDS_ATTENTION") return "pending";
  return "neutral";
}

const DECIDED_STATUSES = new Set(["APPROVED", "REJECTED"]);

/**
 * V4.0 B2/B3 — registration request detail: Coordinator/Secretary can leave
 * a comment and mark Reviewed/Needs Attention (§7 step 3, §9 — "Cannot
 * decide"); the Secretary alone additionally sees the Decision panel (Q1 —
 * sole final approval authority), backed server-side by
 * canDecideRegistrationRequest, not just this page hiding the panel.
 */
export default function RegistrationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { accessToken, role } = useAuth();
  const toast = useToast();
  const canDecide = role === "SECRETARY";

  const [request, setRequest] = useState<RegistrationRequestRecord | null>(null);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [credentialsEmailSent, setCredentialsEmailSent] = useState<boolean | null>(null);
  const [isDeciding, setIsDeciding] = useState(false);
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [isResendingCredentials, setIsResendingCredentials] = useState(false);
  const [isCredentialsResendOpen, setIsCredentialsResendOpen] = useState(false);
  const [resentTempPassword, setResentTempPassword] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const load = useCallback(async () => {
    if (!accessToken || !id) return;
    try {
      const record = await apiClient.get<RegistrationRequestRecord>(`/api/registration/${id}`, accessToken);
      setRequest(record);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load this registration request.");
    }
  }, [accessToken, id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function handleMark(status: "REVIEWED" | "NEEDS_ATTENTION") {
    if (!accessToken || !request || !comment.trim()) return;
    setIsSubmitting(true);
    try {
      await apiClient.patch(`/api/registration/${request.id}`, { status, comment }, accessToken);
      toast.success(status === "REVIEWED" ? "Marked Reviewed." : "Marked Needs Attention.");
      setComment("");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to update this request.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  async function handleApprove() {
    if (!accessToken || !request) return;
    setIsDeciding(true);
    try {
      const result = await apiClient.post<{
        request: RegistrationRequestRecord;
        tempPassword?: string;
        credentialsEmailSent?: boolean;
      }>(
        `/api/registration/${request.id}/decide`,
        { decision: "APPROVE" },
        accessToken,
      );
      setTempPassword(result.tempPassword ?? null);
      setCredentialsEmailSent(result.credentialsEmailSent ?? false);
      setRequest(result.request);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to approve this application.");
      setIsApproveOpen(false);
    } finally {
      setIsDeciding(false);
    }
  }

  async function handleResendVerification() {
    if (!accessToken || !request) return;
    setIsResendingVerification(true);
    try {
      const result = await apiClient.post<{ resent: boolean; emailSent?: boolean }>(
        `/api/registration/${request.id}/verification/resend`,
        {},
        accessToken,
      );
      if (!result.resent) {
        toast.success("This email is already verified.");
      } else if (result.emailSent) {
        toast.success("Verification email sent.");
      } else {
        toast.error("Verification link could not be sent. Check email configuration or try again.");
      }
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to resend the verification email.");
    } finally {
      setIsResendingVerification(false);
    }
  }

  async function handleResendCredentials() {
    if (!accessToken || !request) return;
    setIsResendingCredentials(true);
    try {
      const result = await apiClient.post<{ tempPassword: string; credentialsEmailSent: boolean }>(
        `/api/registration/${request.id}/credentials/resend`,
        {},
        accessToken,
      );
      setResentTempPassword(result.tempPassword);
      setCredentialsEmailSent(result.credentialsEmailSent);
      if (result.credentialsEmailSent) {
        toast.success("New account credentials were emailed.");
      } else {
        toast.error("A new account password was created, but the credentials email could not be sent.");
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to resend account credentials.");
      setIsCredentialsResendOpen(false);
    } finally {
      setIsResendingCredentials(false);
    }
  }

  async function handleReject() {
    if (!accessToken || !request || !rejectionReason.trim()) return;
    setIsDeciding(true);
    try {
      await apiClient.post(
        `/api/registration/${request.id}/decide`,
        { decision: "REJECT", rejectionReason },
        accessToken,
      );
      toast.success("Application rejected. The applicant has been notified.");
      setRejectionReason("");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to reject this application.");
    } finally {
      setIsDeciding(false);
    }
  }

  if (error && !request) {
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard/registrations"
          className="inline-flex items-center gap-1 text-sm font-medium text-(--color-accent) hover:underline"
        >
          <ChevronLeft aria-hidden="true" size={16} strokeWidth={2} />
          Back to Registrations
        </Link>
        <p className="text-sm text-(--color-danger)">{error}</p>
      </div>
    );
  }

  if (!request) {
    return <p className="text-sm text-(--color-text-secondary)">Loading…</p>;
  }

  const submittedData = request.submittedData;
  const isDecided = DECIDED_STATUSES.has(request.status);
  const isEmailVerified = request.emailVerifiedAt !== null;

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href="/dashboard/registrations"
        className="inline-flex items-center gap-1 text-sm font-medium text-(--color-accent) hover:underline"
      >
        <ChevronLeft aria-hidden="true" size={16} strokeWidth={2} />
        Back to Registrations
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-(--color-text-primary)">
            {request.fullName}
          </h1>
          <p className="mt-1 text-sm text-(--color-text-secondary)">{request.rollNumber}</p>
        </div>
        <Badge variant={statusBadgeVariant(request.status)}>{request.status.replace("_", " ")}</Badge>
      </div>

      <Card className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <DataLabel>Email</DataLabel>
            <p className="mt-1 text-sm text-(--color-text-primary)">{request.email}</p>
          </div>
          <div>
            <DataLabel>Phone</DataLabel>
            <p className="mt-1 text-sm text-(--color-text-primary)">{submittedData.phone ?? "—"}</p>
          </div>
          <div>
            <DataLabel>Personal Email</DataLabel>
            <p className="mt-1 text-sm text-(--color-text-primary)">{submittedData.personalEmail ?? "—"}</p>
          </div>
        </div>
        {submittedData.notes && (
          <div>
            <DataLabel>Notes from applicant</DataLabel>
            <p className="mt-1 text-sm text-(--color-text-primary)">{submittedData.notes}</p>
          </div>
        )}

        {request.coordinatorComment && (
          <div className="rounded-lg border border-(--color-border) bg-(--color-surface-muted) p-3">
            <DataLabel>Reviewer Comment</DataLabel>
            <p className="mt-1 text-sm text-(--color-text-primary)">{request.coordinatorComment}</p>
          </div>
        )}

        {request.rejectionReason && (
          <div className="rounded-lg border border-(--color-danger)/30 bg-(--color-danger-soft) p-3">
            <DataLabel>Rejection Reason</DataLabel>
            <p className="mt-1 text-sm text-(--color-text-primary)">{request.rejectionReason}</p>
          </div>
        )}

        <div className="rounded-lg border border-(--color-border) bg-(--color-surface-muted) p-3">
          <DataLabel>Email status</DataLabel>
          <p className="mt-1 text-sm text-(--color-text-primary)">
            {isEmailVerified ? "Verified" : "Not verified"}
          </p>
          {!isDecided && canDecide && !isEmailVerified && (
            <Button
              type="button"
              variant="secondary"
              className="mt-3"
              onClick={handleResendVerification}
              disabled={isResendingVerification}
            >
              {isResendingVerification ? "Requesting verification email…" : "Resend verification email"}
            </Button>
          )}
          {request.status === "APPROVED" && canDecide && (
            <div className="mt-3 border-t border-(--color-border) pt-3">
              <DataLabel>Account</DataLabel>
              <p className="mt-1 text-sm text-(--color-text-primary)">Created</p>
              <DataLabel className="mt-3">Login email</DataLabel>
              <p className="mt-1 text-sm text-(--color-text-primary)">{request.email}</p>
              <DataLabel className="mt-3">Credential email</DataLabel>
              <p className="mt-1 text-sm text-(--color-text-primary)">
                {credentialsEmailSent === true
                  ? "Sent"
                  : credentialsEmailSent === false
                    ? "Delivery failed"
                    : "Not sent"}
              </p>
              {credentialsEmailSent === false && (
                <p className="mt-1 text-sm text-(--color-danger)">
                  Account created, but credentials email could not be sent.
                </p>
              )}
              <Button
                type="button"
                variant="secondary"
                className="mt-3"
                onClick={() => setIsCredentialsResendOpen(true)}
                disabled={isResendingCredentials}
              >
                Resend Account Credentials
              </Button>
            </div>
          )}
        </div>
      </Card>

      {!isDecided && (
        <Card className="space-y-4 border-t-2 border-t-(--color-accent)">
          <DataLabel>Reviewer Actions</DataLabel>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Label htmlFor="review-comment">Comment</Label>
              <Textarea
                id="review-comment"
                placeholder="Add context for the Secretary's decision…"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => handleMark("REVIEWED")}
                disabled={isSubmitting || !comment.trim()}
              >
                Mark Reviewed
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => handleMark("NEEDS_ATTENTION")}
                disabled={isSubmitting || !comment.trim()}
              >
                Mark Needs Attention
              </Button>
            </div>
          </form>
        </Card>
      )}

      {!isDecided && canDecide && (
        <Card className="space-y-4 border-t-2 border-t-(--color-success)">
          <DataLabel>Secretary Decision</DataLabel>
          <p className="text-sm text-(--color-text-secondary)">
            Approving creates a real student account for {request.fullName} and issues a temporary password.
            Rejecting notifies the applicant by email with the reason below — no account is ever created.
          </p>
          <Button type="button" variant="primary" onClick={() => setIsApproveOpen(true)} disabled={isDeciding}>
            Approve
          </Button>

          <div className="border-t border-(--color-border) pt-4">
            <Label htmlFor="rejection-reason">Rejection reason</Label>
            <Textarea
              id="rejection-reason"
              placeholder="Explain why this application is being rejected…"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
            />
            <Button
              type="button"
              variant="destructive"
              className="mt-2"
              onClick={handleReject}
              disabled={isDeciding || !rejectionReason.trim()}
            >
              Reject
            </Button>
          </div>
        </Card>
      )}

      <RevealPasswordModal
        isOpen={isApproveOpen}
        onClose={() => {
          setIsApproveOpen(false);
          setTempPassword(null);
        }}
        pendingTitle={isEmailVerified ? "Approve this application?" : "Email not verified"}
        revealedTitle="Student account created"
        tempPassword={tempPassword}
        description={
          <>Share this temporary password with {request.fullName} — it will not be shown again. They must change it on first sign-in.</>
        }
      >
        <div className="space-y-4">
          {isEmailVerified ? (
            <p className="text-sm text-(--color-text-secondary)">
              This creates a real student account for {request.fullName} in the selected batch and issues a temporary
              password.
            </p>
          ) : (
            <p className="text-sm text-(--color-danger)">
              This applicant has not verified their email address. You are manually approving this registration and
              creating the Student account anyway.
            </p>
          )}
          <div className="flex justify-end gap-3 border-t border-(--color-border) pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsApproveOpen(false)} disabled={isDeciding}>
              Cancel
            </Button>
            <Button type="button" variant="primary" onClick={handleApprove} disabled={isDeciding}>
              {isDeciding ? "Approving…" : "Approve & Create Account"}
            </Button>
          </div>
        </div>
      </RevealPasswordModal>

      <ConfirmDialog
        isOpen={isCredentialsResendOpen && resentTempPassword === null}
        onClose={() => setIsCredentialsResendOpen(false)}
        onConfirm={handleResendCredentials}
        title="Resend account credentials?"
        description="Resending credentials will generate a new temporary password and invalidate the previous temporary password."
        confirmLabel="Generate & Send Credentials"
        isConfirming={isResendingCredentials}
      />

      <RevealPasswordModal
        isOpen={isCredentialsResendOpen && resentTempPassword !== null}
        onClose={() => {
          setIsCredentialsResendOpen(false);
          setResentTempPassword(null);
        }}
        pendingTitle="Resend account credentials?"
        revealedTitle="New student credentials created"
        tempPassword={resentTempPassword}
        description={
          <>This new temporary password replaces the prior password and must be changed after the student signs in.</>
        }
      >
        <span />
      </RevealPasswordModal>
    </div>
  );
}
