"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/modules/auth/client";
import { apiClient, ApiError } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";
import { useRowSelection } from "@/lib/use-row-selection";
import type {
  PublicationTemplateRecord,
  SelectableDataResult,
  SelectableStudentOption,
  SelectableCompanyOption,
  SelectableAlumniOption,
} from "@/modules/publications";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Stepper, type StepperStep } from "@/components/ui/stepper";
import { DataLabel } from "@/components/ui/typography";
import { EmptyState } from "@/components/empty-state";
import { FileText } from "lucide-react";

type WizardStep = "template" | "data" | "details";

/**
 * V4.0 E4 (§13.1 steps 1-2) — "Choose Template → Select Real Platform Data →
 * Auto-populate," as one guided flow. Reuses `Stepper` (the Academic Year
 * Wizard's own component, no second stepper built) and `useRowSelection`
 * (§13.1's own explicit instruction: "multi-select, reusing the
 * useRowSelection pattern already built").
 */
export default function NewPublicationPage() {
  const { accessToken } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const [step, setStep] = useState<WizardStep>("template");
  const [templates, setTemplates] = useState<PublicationTemplateRecord[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<PublicationTemplateRecord | null>(null);
  const [selectableData, setSelectableData] = useState<SelectableDataResult | null>(null);
  const [title, setTitle] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    (async () => {
      try {
        const result = await apiClient.get<PublicationTemplateRecord[]>("/api/publication-templates", accessToken);
        setTemplates(result);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Unable to load templates.");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [accessToken]);

  const studentOptions = selectableData?.kind === "STUDENTS" ? selectableData.options : [];
  const companyOptions = selectableData?.kind === "COMPANIES" ? selectableData.options : [];
  const alumniOptions = selectableData?.kind === "ALUMNI" ? selectableData.options : [];

  const studentSelection = useRowSelection(studentOptions, (s: SelectableStudentOption) => s.studentProfileId);
  const companySelection = useRowSelection(companyOptions, (c: SelectableCompanyOption) => c.companyId);
  const alumniSelection = useRowSelection(alumniOptions, (a: SelectableAlumniOption) => a.alumniProfileId);

  const steps: StepperStep[] = useMemo(() => {
    const base: StepperStep[] = [{ id: "template", label: "Choose Template" }];
    if (selectedTemplate && selectedTemplate.structure.dataBinding !== "NONE" && selectedTemplate.structure.dataBinding !== "STATS") {
      base.push({ id: "data", label: "Select Data" });
    }
    base.push({ id: "details", label: "Details" });
    return base;
  }, [selectedTemplate]);

  async function handleSelectTemplate(template: PublicationTemplateRecord) {
    setSelectedTemplate(template);
    setTitle(template.name);
    if (!accessToken) return;

    if (template.structure.dataBinding === "NONE" || template.structure.dataBinding === "STATS") {
      setStep("details");
      return;
    }

    try {
      const result = await apiClient.get<SelectableDataResult>(`/api/publications/data?kind=${template.structure.dataBinding}`, accessToken);
      setSelectableData(result);
      setStep("data");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to load selectable data.");
    }
  }

  function selectedIdsForSubmit(): string[] {
    if (!selectedTemplate) return [];
    switch (selectedTemplate.structure.dataBinding) {
      case "STUDENTS":
        return [...studentSelection.selectedIds];
      case "COMPANIES":
        return [...companySelection.selectedIds];
      case "ALUMNI":
        return [...alumniSelection.selectedIds];
      default:
        return [];
    }
  }

  async function handleCreate() {
    if (!accessToken || !selectedTemplate) return;
    setIsCreating(true);
    setError(null);
    try {
      const created = await apiClient.post<{ id: string }>(
        "/api/publications",
        { title: title.trim(), templateId: selectedTemplate.id, pageSize: "A4_PORTRAIT", selectedIds: selectedIdsForSubmit() },
        accessToken,
      );
      toast.success("Publication created.");
      router.push(`/dashboard/publications/${created.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to create this publication.");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <DataLabel>Publication Studio</DataLabel>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold text-(--color-text-primary)">
          New Publication
        </h1>
      </div>

      <Stepper steps={steps} currentStepId={step} />

      {error && <p className="text-sm text-(--color-danger)">{error}</p>}
      {isLoading && <p className="text-sm text-(--color-text-secondary)">Loading templates…</p>}

      {!isLoading && step === "template" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {templates.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => void handleSelectTemplate(template)}
              className="rounded-lg border border-(--color-border) bg-(--color-surface) p-4 text-left shadow-sm transition-[border-color,box-shadow] duration-150 hover:border-(--color-accent) hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--color-accent-soft) text-(--color-accent)">
                  <FileText aria-hidden="true" size={17} strokeWidth={1.75} />
                </span>
                <p className="font-medium text-(--color-text-primary)">{template.name}</p>
              </div>
              {template.description && <p className="mt-2 text-xs text-(--color-text-secondary)">{template.description}</p>}
            </button>
          ))}
        </div>
      )}

      {step === "data" && selectedTemplate && (
        <Card className="space-y-4">
          <p className="text-sm text-(--color-text-secondary)">
            Select the {selectedTemplate.structure.dataBinding.toLowerCase()} to auto-populate — sourced live from real platform records, never retyped.
          </p>

          {selectedTemplate.structure.dataBinding === "STUDENTS" && (
            <SelectableList
              items={studentOptions}
              getId={(s) => s.studentProfileId}
              getLabel={(s) => s.fullName}
              getSubLabel={(s) => s.batchName}
              selection={studentSelection}
            />
          )}
          {selectedTemplate.structure.dataBinding === "COMPANIES" && (
            <SelectableList items={companyOptions} getId={(c) => c.companyId} getLabel={(c) => c.name} selection={companySelection} />
          )}
          {selectedTemplate.structure.dataBinding === "ALUMNI" && (
            <SelectableList
              items={alumniOptions}
              getId={(a) => a.alumniProfileId}
              getLabel={(a) => a.fullName}
              getSubLabel={(a) => `Class of ${a.graduationYear}`}
              selection={alumniSelection}
            />
          )}

          <div className="flex justify-between border-t border-(--color-border) pt-4">
            <Button type="button" variant="ghost" onClick={() => setStep("template")}>
              Back
            </Button>
            <Button type="button" variant="primary" onClick={() => setStep("details")} disabled={selectedIdsForSubmit().length === 0}>
              Continue
            </Button>
          </div>
        </Card>
      )}

      {step === "details" && selectedTemplate && (
        <Card className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="flex justify-between border-t border-(--color-border) pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep(selectedTemplate.structure.dataBinding === "NONE" || selectedTemplate.structure.dataBinding === "STATS" ? "template" : "data")}
            >
              Back
            </Button>
            <Button type="button" variant="primary" onClick={() => void handleCreate()} disabled={isCreating || !title.trim()}>
              {isCreating ? "Creating…" : "Create Publication"}
            </Button>
          </div>
        </Card>
      )}

      {!isLoading && step === "template" && templates.length === 0 && (
        <Card>
          <EmptyState icon={FileText} message="No publication templates are available." />
        </Card>
      )}
    </div>
  );
}

function SelectableList<T>({
  items,
  getId,
  getLabel,
  getSubLabel,
  selection,
}: {
  items: readonly T[];
  getId: (item: T) => string;
  getLabel: (item: T) => string;
  getSubLabel?: (item: T) => string;
  selection: ReturnType<typeof useRowSelection<T>>;
}) {
  if (items.length === 0) {
    return <EmptyState icon={FileText} message="Nothing available to select yet." />;
  }
  return (
    <div className="max-h-80 space-y-1 overflow-y-auto rounded-md border border-(--color-border) p-2">
      <div className="flex items-center justify-between px-2 pb-2 text-xs text-(--color-text-secondary)">
        <span>{selection.selectedCount} selected</span>
        <button type="button" onClick={selection.toggleAll} className="font-medium text-(--color-accent) hover:underline">
          {selection.isAllSelected ? "Clear all" : "Select all"}
        </button>
      </div>
      {items.map((item) => (
        <label
          key={getId(item)}
          className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors duration-150 hover:bg-(--color-surface-muted)"
        >
          <input
            type="checkbox"
            checked={selection.isSelected(item)}
            onChange={() => selection.toggle(item)}
            className="h-4 w-4 rounded border-(--color-border) text-(--color-accent) focus:ring-(--color-accent)"
          />
          <span className="min-w-0">
            <span className="block truncate text-(--color-text-primary)">{getLabel(item)}</span>
            {getSubLabel && <span className="block text-xs text-(--color-text-secondary)">{getSubLabel(item)}</span>}
          </span>
        </label>
      ))}
    </div>
  );
}
