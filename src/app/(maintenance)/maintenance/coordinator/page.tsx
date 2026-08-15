"use client";

import { useCallback, useEffect, useState } from "react";
import { UserCog } from "lucide-react";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { DataLabel } from "@/components/ui/typography";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/components/ui/toast";
import { coordinatorPermissionLabel } from "@/lib/coordinator-permissions";

interface MaintenanceCoordinatorDto {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  isActive: boolean;
  permissions: string[];
}

// The fixed eight-key allowlist UpdateMaintenanceCoordinatorPermissionsUseCase
// enforces server-side — kept in sync manually (same "format here, catalog
// membership server-side" split every other permission editor in this
// codebase uses).
const MAINTENANCE_COORDINATOR_PERMISSION_KEYS = [
  "maintenance.view",
  "maintenance.assign",
  "maintenance.manage",
  "maintenance.update",
  "maintenance.resolve",
  "maintenance.reassign",
  "maintenance.tasks",
  "maintenance.reports",
] as const;

/**
 * MYARCH Maintenance functional hierarchy — the workspace's own
 * "Maintenance Coordinator" tab. Reachable by Secretary, a
 * MAINTENANCE_SECRETARY-flagged Coordinator (both may edit), and the
 * designated MAINTENANCE_COORDINATOR themselves (read-only view of their
 * own delegated permissions) — enforced server-side by
 * GetMaintenanceCoordinatorUseCase/UpdateMaintenanceCoordinatorPermissionsUseCase,
 * this page only reflects that.
 */
export default function MaintenanceCoordinatorPage() {
  const { accessToken, role, maintenanceRole } = useAuth();
  const toast = useToast();

  const [coordinator, setCoordinator] = useState<MaintenanceCoordinatorDto | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const canEdit = role === "SECRETARY" || maintenanceRole === "MAINTENANCE_SECRETARY";

  const load = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiClient.get<MaintenanceCoordinatorDto | null>("/api/maintenance/coordinator", accessToken);
      setCoordinator(result);
      setSelectedPermissions(result ? [...result.permissions] : []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load the Maintenance Coordinator.");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  function togglePermission(key: string) {
    setSelectedPermissions((prev) => (prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]));
  }

  async function handleSave() {
    if (!accessToken) return;
    setIsSaving(true);
    try {
      await apiClient.patch("/api/maintenance/coordinator", { permissions: selectedPermissions }, accessToken);
      toast.success("Maintenance Coordinator permissions updated.");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to update permissions.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) return <p className="text-sm text-(--color-text-secondary)">Loading…</p>;
  if (error) return <p className="text-sm text-(--color-danger)">{error}</p>;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-(--color-text-primary)">
        Maintenance Coordinator
      </h1>

      {!coordinator ? (
        <Card>
          <EmptyState
            icon={UserCog}
            message="No Maintenance Coordinator is currently designated. Ask the Technical Secretary to assign one from the Coordinators page."
          />
        </Card>
      ) : (
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-(--color-text-primary)">{coordinator.fullName}</p>
              <p className="text-sm text-(--color-text-secondary)">{coordinator.email}</p>
            </div>
            <Badge variant={coordinator.isActive ? "active" : "archived"}>
              {coordinator.isActive ? "Active" : "Disabled"}
            </Badge>
          </div>

          <div className="mt-6">
            <DataLabel>Delegated Maintenance permissions</DataLabel>
            <p className="mt-1 text-sm text-(--color-text-secondary)">
              {canEdit
                ? "Granular Maintenance capabilities delegated to the Maintenance Coordinator."
                : "Your delegated Maintenance capabilities."}
            </p>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
              {MAINTENANCE_COORDINATOR_PERMISSION_KEYS.map((key) =>
                canEdit ? (
                  <Checkbox
                    key={key}
                    id={`mc-perm-${key}`}
                    label={coordinatorPermissionLabel(key)}
                    checked={selectedPermissions.includes(key)}
                    onChange={() => togglePermission(key)}
                  />
                ) : (
                  <Badge key={key} variant={coordinator.permissions.includes(key) ? "active" : "neutral"}>
                    {coordinatorPermissionLabel(key)}
                  </Badge>
                ),
              )}
            </div>
          </div>

          {canEdit && (
            <div className="mt-4 border-t border-(--color-border) pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={handleSave}
                disabled={
                  isSaving ||
                  JSON.stringify([...selectedPermissions].sort()) === JSON.stringify([...coordinator.permissions].sort())
                }
              >
                {isSaving ? "Saving…" : "Save permissions"}
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
