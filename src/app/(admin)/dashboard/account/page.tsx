"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Camera, Lock } from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";
import { DashboardPanel } from "@/components/dashboard-panel";
import { useToast } from "@/components/ui/toast";

interface MeProfile {
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
}

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

/**
 * Secretary/Coordinator self-service: display name, email (current-password
 * gated, per the spec's "current password required for sensitive changes"),
 * profile photo, and a link to the dedicated password-change screen (reused
 * rather than a duplicate form here). Reachable only from the (admin)
 * shell's UserMenu — see sheet-layout.tsx's accountSettingsHref.
 */
export default function AccountSettingsPage() {
  const { accessToken } = useAuth();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<MeProfile | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;

    (async () => {
      try {
        const me = await apiClient.get<MeProfile>("/api/auth/me", accessToken);
        if (cancelled) return;
        setProfile(me);
        setFullName(me.fullName ?? "");
        setEmail(me.email);
      } catch {
        // Loading failure just leaves the form empty — the Save action will
        // still work once retried.
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const emailChanged = profile !== null && email.trim() !== profile.email;
  const fullNameChanged = profile !== null && fullName.trim() !== (profile.fullName ?? "") && fullName.trim().length > 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;
    setError(null);

    const body: { fullName?: string; email?: string; currentPassword?: string } = {};
    if (fullNameChanged) body.fullName = fullName.trim();
    if (emailChanged) {
      body.email = email.trim();
      body.currentPassword = currentPassword;
    }
    if (Object.keys(body).length === 0) return;

    setIsSaving(true);
    try {
      const result = await apiClient.patch<{ email: string }>("/api/auth/profile", body, accessToken ?? undefined);
      setProfile((prev) => (prev ? { ...prev, email: result.email, fullName: fullName.trim() || prev.fullName } : prev));
      setCurrentPassword("");
      toast.success("Account settings saved.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to save changes.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (file.size > MAX_AVATAR_BYTES) {
      toast.error("Image must be 2MB or smaller.");
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await apiClient.upload<{ avatarUrl: string }>(
        "/api/auth/profile/avatar",
        formData,
        accessToken ?? undefined,
      );
      setProfile((prev) => (prev ? { ...prev, avatarUrl: result.avatarUrl } : prev));
      toast.success("Profile photo updated.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to upload photo.");
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  if (isLoading) {
    return <p className="text-sm text-(--color-text-secondary)">Loading account settings…</p>;
  }

  const initial = (profile?.fullName ?? profile?.email ?? "?").charAt(0).toUpperCase();

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-(--color-text-primary)">
          Account Settings
        </h1>
        <p className="mt-1 text-sm text-(--color-text-secondary)">Manage your own name, email, password, and photo.</p>
      </div>

      <DashboardPanel title="Profile Photo" icon={Camera}>
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-(--color-accent-soft) text-xl font-semibold text-(--color-accent)">
            {profile?.avatarUrl ? (
              <Image src={profile.avatarUrl} alt="" width={64} height={64} className="h-full w-full object-cover" unoptimized />
            ) : (
              initial
            )}
          </span>
          <div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
            >
              {isUploadingAvatar ? "Uploading…" : "Change photo"}
            </Button>
            <p className="mt-1 text-xs text-(--color-text-secondary)">JPEG, PNG, or WebP. Max 2MB.</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
        </div>
      </DashboardPanel>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="fullName">Display name</Label>
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {emailChanged && (
            <div>
              <Label htmlFor="currentPassword">Current password (required to change email)</Label>
              <Input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
          )}

          <FieldError>{error ?? undefined}</FieldError>

          <div className="border-t border-(--color-border) pt-4">
            <Button type="submit" variant="primary" disabled={isSaving || (!fullNameChanged && !emailChanged)}>
              {isSaving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </Card>

      <DashboardPanel title="Password" icon={Lock}>
        <p className="text-sm text-(--color-text-secondary)">
          Change your password from the dedicated password screen.
        </p>
        <Link
          href="/change-password"
          className="mt-3 inline-flex items-center text-sm font-medium text-(--color-accent) hover:underline"
        >
          Change password
        </Link>
      </DashboardPanel>
    </div>
  );
}
