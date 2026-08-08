"use client";

import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldError, Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DataLabel } from "@/components/ui/typography";

const REASON_OPTIONS = [
  { value: "general", label: "General Enquiry" },
  { value: "recruiter", label: "Recruiter Access" },
  { value: "student", label: "Student Support" },
] as const;

type ReasonValue = (typeof REASON_OPTIONS)[number]["value"];

function isReasonValue(value: string | null): value is ReasonValue {
  return REASON_OPTIONS.some((option) => option.value === value);
}

interface FormErrors {
  name?: string;
  email?: string;
  message?: string;
}

export interface ContactFormProps {
  /** Where a visitor should be told to email directly, since online submission isn't wired to a backend yet. */
  contactEmail: string;
}

/**
 * The Contact page's enquiry form — visual and client-side-validated only,
 * per this milestone's explicit scope: no submission endpoint exists yet
 * (V1_UI_SPECIFICATION.md's open question #3), and none is invented here.
 * Built as its own component, on the explicit instruction that it be
 * "ready for future integration" — swapping the post-validation branch
 * below for a real `fetch` call is the only change a real backend will
 * need; the page composing it won't have to change at all.
 *
 * Reads an optional `?reason=` query param to preselect the Reason field —
 * the mechanism the approved spec anticipated for other pages' recruiter/
 * student CTAs to deep-link into this form (Part D.6). No other page links
 * with that param yet; this component is ready for when one does, without
 * requiring a second change here.
 */
export function ContactForm({ contactEmail }: ContactFormProps) {
  const searchParams = useSearchParams();
  const presetReason = searchParams.get("reason");
  const initialReason: ReasonValue = isReasonValue(presetReason) ? presetReason : "general";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState<ReasonValue>(initialReason);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: FormErrors = {};
    if (!name.trim()) nextErrors.name = "Enter your name.";
    if (!email.trim()) nextErrors.email = "Enter your email.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) nextErrors.email = "Enter a valid email address.";
    if (!message.trim()) nextErrors.message = "Enter a message.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) setSubmitted(true);
  }

  if (submitted) {
    return (
      <Card className="p-8 text-center shadow-lg lg:p-12">
        <DataLabel className="text-(--color-accent)">Message Ready</DataLabel>
        <p className="mt-3 text-(--color-text-secondary)">
          Online submission isn&rsquo;t connected yet. In the meantime, please send this directly to{" "}
          <a href={`mailto:${contactEmail}`} className="font-medium text-(--color-accent) hover:underline">
            {contactEmail}
          </a>
          .
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-8 shadow-lg lg:p-12">
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <div>
          <Label htmlFor="contact-name">Name</Label>
          <Input id="contact-name" value={name} onChange={(event) => setName(event.target.value)} />
          <FieldError>{errors.name}</FieldError>
        </div>

        <div>
          <Label htmlFor="contact-email">Email</Label>
          <Input id="contact-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          <FieldError>{errors.email}</FieldError>
        </div>

        <div>
          <Label htmlFor="contact-reason">Reason</Label>
          <Select id="contact-reason" value={reason} onChange={(event) => setReason(event.target.value as ReasonValue)}>
            {REASON_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="contact-message">Message</Label>
          <Textarea id="contact-message" rows={5} value={message} onChange={(event) => setMessage(event.target.value)} />
          <FieldError>{errors.message}</FieldError>
        </div>

        <Button type="submit" variant="primary" className="w-full py-3 text-base">
          Send Message
        </Button>
      </form>
    </Card>
  );
}
