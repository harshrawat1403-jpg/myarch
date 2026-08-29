import type { FormEvent, ReactNode } from "react";
import { Card } from "./card";
import { Button } from "./button";

export interface FilterBarProps {
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
}

/**
 * Edit Mode — the `<Card><form className="flex flex-wrap items-end
 * gap-4">...<Button type="submit" variant="secondary">Apply</Button>
 * </form></Card>` shell that every module list page's filter form
 * (Meetings/Events/Announcements/Maintenance/Requests/Tasks/Committees)
 * previously hand-rolled identically. Callers supply only their own
 * filter fields as children — the wrapper, layout, and Apply button are
 * now defined once.
 */
export function FilterBar({ onSubmit, children }: FilterBarProps) {
  return (
    <Card>
      <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-4">
        {children}
        <Button type="submit" variant="secondary">
          Apply
        </Button>
      </form>
    </Card>
  );
}
