import { describe, expect, it, vi } from "vitest";

// `Home` is a Server Component that composes HomeClientGate around
// HomeMarketingContent — see home-client-gate.test.tsx for the
// redirect/loading logic and home-content.test.tsx for the marketing
// content itself, both fully rendered and asserted there.
//
// This file only checks the composition itself, and deliberately does NOT
// call testing-library's render(): rendering a Server Component that
// nests ANOTHER async Server Component as a JSX child (HomeClientGate →
// HomeMarketingContent) isn't supported by React's plain client renderer
// outside Next's real RSC pipeline — confirmed the hard way (an empty
// render with no error). Inspecting the resolved element tree directly
// avoids that limitation; the actual end-to-end composition is verified by
// `next build` succeeding and the live dev-server smoke test.
vi.mock("@/modules/content-overrides", () => ({ getPageContentOverridesUseCase: { execute: vi.fn().mockResolvedValue({}) } }));

import Home from "../../../src/app/(marketing)/page";
import { HomeClientGate } from "../../../src/app/(marketing)/home-client-gate";
import HomeMarketingContent from "../../../src/app/(marketing)/home-content";

describe("Home (/) — Server Component composition", () => {
  it("wraps HomeMarketingContent in HomeClientGate", async () => {
    const element = await Home();
    expect(element.type).toBe(HomeClientGate);
    expect(element.props.children.type).toBe(HomeMarketingContent);
  });
});
