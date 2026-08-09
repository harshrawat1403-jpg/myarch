import type { CoordinatorPosition } from "@/modules/coordinators";

/** Display label only — see CoordinatorPosition doc comment in the coordinators module. */
export function coordinatorPositionLabel(position: CoordinatorPosition | null): string {
  if (position === "T_AND_P") return "T&P";
  if (position === "ALUMNI") return "Alumni";
  return "—";
}

export const COORDINATOR_POSITION_OPTIONS: { value: CoordinatorPosition; label: string }[] = [
  { value: "T_AND_P", label: "T&P" },
  { value: "ALUMNI", label: "Alumni" },
];
