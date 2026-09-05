"use client";
import type { FormEvent } from "react";
import type { ElectionRecord } from "@/modules/elections";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

function localDate(value?: Date | null) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
const scheduleFields = [
  ["applicationOpenAt", "Applications open", true],
  ["applicationCloseAt", "Applications close", true],
  ["correctionOpenAt", "Correction/objection window opens", false],
  ["correctionCloseAt", "Correction/objection window closes", false],
  ["campaignOpenAt", "Campaign opens", false],
  ["campaignCloseAt", "Campaign closes", false],
  ["votingOpenAt", "Voting opens", false],
  ["votingCloseAt", "Voting closes", false],
] as const;
export function ElectionConfigForm({
  election,
  busy,
  onSave,
}: {
  election?: ElectionRecord;
  busy: boolean;
  onSave: (data: unknown) => Promise<void>;
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const dates = Object.fromEntries(
      scheduleFields.map(([key]) => [
        key,
        data.get(key) ? new Date(String(data.get(key))).toISOString() : null,
      ]),
    );
    void onSave({
      title: data.get("title"),
      academicYear: data.get("academicYear"),
      type: data.get("type"),
      ...dates,
      campaignEnabled: data.get("campaignEnabled") === "on",
      notaEnabled: data.get("notaEnabled") === "on",
      maxPositionsPerCandidate: Number(data.get("maxPositionsPerCandidate")),
      ...Object.fromEntries(
        ["student", "faculty", "exCouncil"].map((group) => [
          `${group}QuorumPercent`,
          Number(data.get(`${group}QuorumPercent`)),
        ]),
      ),
    });
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <fieldset
        disabled={busy || Boolean(election && election.status !== "DRAFT")}
        className="space-y-4"
      >
        <div>
          <Label htmlFor="election-title">Election title</Label>
          <Input
            id="election-title"
            name="title"
            required
            maxLength={200}
            defaultValue={election?.title}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="academic-year">Academic year</Label>
            <Input
              id="academic-year"
              name="academicYear"
              required
              pattern="[0-9]{4}-[0-9]{4}"
              placeholder="2026-2027"
              defaultValue={election?.academicYear}
            />
          </div>
          <div>
            <Label htmlFor="election-type">Election type</Label>
            <Input id="election-type" name="type" value="COUNCIL" readOnly />
            <p className="mt-1 text-sm text-(--color-text-secondary)">
              Department Council election
            </p>
          </div>
        </div>
        <div>
          <Label htmlFor="position-limit">Maximum positions per candidate</Label>
          <Input
            id="position-limit"
            name="maxPositionsPerCandidate"
            type="number"
            required
            min={1}
            max={100}
            defaultValue={election?.maxPositionsPerCandidate ?? 1}
          />
        </div>
        <p className="text-sm text-(--color-text-secondary)">
          Dates use your local time zone. Optional later windows store the schedule only.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {scheduleFields.map(([key, label, required]) => (
            <div key={key}>
              <Label htmlFor={key}>{label}</Label>
              <Input
                id={key}
                name={key}
                type="datetime-local"
                required={required}
                defaultValue={localDate(election?.[key])}
              />
            </div>
          ))}
        </div>
        <label className="flex gap-2 text-sm">
          <input
            type="checkbox"
            name="campaignEnabled"
            defaultChecked={election?.campaignEnabled}
          />
          Include campaign window
        </label>
        <label className="flex gap-2 text-sm">
          <input type="checkbox" name="notaEnabled" defaultChecked={election?.notaEnabled} />
          Allow NOTA on Council ballots
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          {(["student", "faculty", "exCouncil"] as const).map((group) => (
            <div key={group}>
              <Label htmlFor={`${group}QuorumPercent`}>
                {group === "exCouncil" ? "Ex-Council" : group === "faculty" ? "Faculty" : "Student"}{" "}
                quorum (%)
              </Label>
              <Input
                id={`${group}QuorumPercent`}
                name={`${group}QuorumPercent`}
                type="number"
                min={0}
                max={100}
                step="0.01"
                required
                defaultValue={election?.[`${group}QuorumPercent`] ?? 0}
              />
            </div>
          ))}
        </div>
        <p className="text-sm text-(--color-text-secondary)">
          0% means no quorum requirement. Quorum calculation is a later stage.
        </p>
        {(!election || election.status === "DRAFT") && (
          <Button type="submit" variant="primary">
            {election ? "Save configuration" : "Create election draft"}
          </Button>
        )}
      </fieldset>
    </form>
  );
}
