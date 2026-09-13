"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DataLabel } from "@/components/ui/typography";

interface BatchOption {
  id: string;
  name: string;
}

interface FormErrors {
  fullName?: string;
  email?: string;
  rollNumber?: string;
  batchId?: string;
  personalEmail?: string;
}

/**
 * V4.0 B1 — the public, unauthenticated registration entry point (§7 step
 * 2). No account exists until a Secretary approves this request (B3);
 * submitting here only creates a RegistrationRequest row. Client-validated
 * the same way ContactForm is, but — unlike ContactForm — actually posts to
 * a real backend (`/api/registration`), since a durable record is the
 * entire point here (§18 point 6).
 */
export function RegistrationForm() {
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [isLoadingBatches, setIsLoadingBatches] = useState(true);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [batchId, setBatchId] = useState("");
  const [phone, setPhone] = useState("");
  const [personalEmail, setPersonalEmail] = useState("");
  const [notes, setNotes] = useState("");

  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/registration/batches");
        const body = await res.json();
        if (!cancelled && res.ok) setBatches(body.data ?? []);
      } catch {
        // Leaving the list empty just shows "no batches available" below —
        // the form itself doesn't need a retry mechanism for this.
      } finally {
        if (!cancelled) setIsLoadingBatches(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);

    const nextErrors: FormErrors = {};
    if (!fullName.trim()) nextErrors.fullName = "Enter your full name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) nextErrors.email = "Enter a valid email address.";
    if (!rollNumber.trim()) nextErrors.rollNumber = "Enter your roll number.";
    if (!batchId) nextErrors.batchId = "Select a batch.";
    if (personalEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personalEmail)) {
      nextErrors.personalEmail = "Enter a valid email address.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          rollNumber: rollNumber.trim(),
          batchId,
          phone: phone.trim() || undefined,
          personalEmail: personalEmail.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setServerError(body?.error?.message ?? "Unable to submit your application. Please try again.");
        return;
      }
      setSubmitted(true);
    } catch {
      setServerError("Unable to reach the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <Card className="p-8 text-center shadow-lg lg:p-12">
        <DataLabel className="text-(--color-accent)">Application Received</DataLabel>
        <p className="mt-3 text-(--color-text-secondary)">
          Check <span className="font-medium text-(--color-text-primary)">{email}</span> for a verification link. You must
          verify your email before the Secretary can approve your application. If it does not arrive, you can{" "}
          <Link href="/verify-email" className="font-medium text-(--color-accent) hover:underline">
            resend the verification email
          </Link>
          .
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-8 shadow-lg lg:p-12">
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <div>
          <Label htmlFor="reg-fullName">Full name</Label>
          <Input id="reg-fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <FieldError>{errors.fullName}</FieldError>
        </div>

        <div>
          <Label htmlFor="reg-email">Email</Label>
          <Input id="reg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <FieldError>{errors.email}</FieldError>
        </div>

        <div>
          <Label htmlFor="reg-rollNumber">Roll number</Label>
          <Input id="reg-rollNumber" value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} />
          <FieldError>{errors.rollNumber}</FieldError>
        </div>

        <div>
          <Label htmlFor="reg-batch">Batch</Label>
          <Select id="reg-batch" value={batchId} onChange={(e) => setBatchId(e.target.value)} disabled={isLoadingBatches}>
            <option value="">{isLoadingBatches ? "Loading batches…" : "Select a batch…"}</option>
            {batches.map((batch) => (
              <option key={batch.id} value={batch.id}>
                {batch.name}
              </option>
            ))}
          </Select>
          <FieldError>{errors.batchId}</FieldError>
          {!isLoadingBatches && batches.length === 0 && (
            <p className="mt-1 text-xs text-(--color-text-secondary)">No batches are currently open for registration.</p>
          )}
        </div>

        <div>
          <Label htmlFor="reg-phone">Phone (optional)</Label>
          <Input id="reg-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>

        <div>
          <Label htmlFor="reg-personalEmail">Personal email (optional)</Label>
          <Input
            id="reg-personalEmail"
            type="email"
            value={personalEmail}
            onChange={(e) => setPersonalEmail(e.target.value)}
          />
          <FieldError>{errors.personalEmail}</FieldError>
        </div>

        <div>
          <Label htmlFor="reg-notes">Anything else? (optional)</Label>
          <Textarea id="reg-notes" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {serverError && <p className="text-sm text-(--color-danger)">{serverError}</p>}

        <Button type="submit" variant="primary" className="w-full py-3 text-base" disabled={isSubmitting}>
          {isSubmitting ? "Submitting…" : "Submit Application"}
        </Button>
      </form>
    </Card>
  );
}
