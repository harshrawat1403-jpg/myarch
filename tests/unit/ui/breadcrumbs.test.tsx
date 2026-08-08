// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Breadcrumbs } from "../../../src/components/breadcrumbs";

describe("Breadcrumbs", () => {
  it("renders every item, linking all but the last", () => {
    render(
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Placements", href: "/placements" },
          { label: "2026 Batch" },
        ]}
      />,
    );

    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Placements" })).toHaveAttribute("href", "/placements");
    expect(screen.queryByRole("link", { name: "2026 Batch" })).not.toBeInTheDocument();
  });

  it("marks only the last item aria-current=page", () => {
    render(
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Current Page" },
        ]}
      />,
    );

    expect(screen.getByText("Current Page")).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");
  });

  it("has an accessible landmark label", () => {
    render(<Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "About" }]} />);
    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toBeInTheDocument();
  });
});
