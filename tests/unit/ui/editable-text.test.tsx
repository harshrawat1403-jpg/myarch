// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../../../src/components/ui/toast";
import { EditModeProvider, useEditMode } from "../../../src/components/edit-mode/edit-mode-context";
import { PageOverridesProvider } from "../../../src/components/edit-mode/page-overrides-context";
import { EditableText } from "../../../src/components/edit-mode/editable-text";

let mockAuthState: { role: string | null; accessToken: string | null } = { role: null, accessToken: null };
const putMock = vi.fn();
const deleteMock = vi.fn();
// EditModeProvider's refreshPendingCount (called on activate) and
// PageOverridesProvider's preview fetch both call apiClient.get — a
// harmless no-op default keeps every test from having to stub it.
const getMock = vi.fn().mockResolvedValue({ total: 0, byPage: {} });

vi.mock("@/modules/auth/client", () => ({ useAuth: () => mockAuthState }));
vi.mock("@/lib/api-client", () => ({
  apiClient: {
    get: (...args: unknown[]) => getMock(...args),
    put: (...args: unknown[]) => putMock(...args),
    delete: (...args: unknown[]) => deleteMock(...args),
  },
  ApiError: class ApiError extends Error {},
}));

// A tiny harness that always renders active=true (Secretary editing on),
// since EditModeProvider itself only exposes a toggle, not a way to force
// isActive from outside — this simulates "the Secretary already clicked
// Edit Mode" without needing to also render EditModeToggle.
function AutoActivate({ children }: { children: React.ReactNode }) {
  const { isActive, toggle } = useEditMode();
  useEffect(() => {
    if (!isActive) toggle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <>{children}</>;
}

function ActiveEditModeHarness({ children }: { children: React.ReactNode }) {
  return (
    <EditModeProvider>
      <AutoActivate>{children}</AutoActivate>
    </EditModeProvider>
  );
}

function renderField(overrides: Record<string, { textValue: string | null }> = {}) {
  return render(
    <ToastProvider>
      <ActiveEditModeHarness>
        <PageOverridesProvider page="about" overrides={overrides as never}>
          <EditableText contentKey="hero.title" defaultValue="Default Title" as="h1" />
        </PageOverridesProvider>
      </ActiveEditModeHarness>
    </ToastProvider>,
  );
}

describe("EditableText", () => {
  beforeEach(() => {
    putMock.mockClear();
    deleteMock.mockClear();
    getMock.mockClear();
  });

  it("renders the plain default value with no edit affordances when Edit Mode is off", () => {
    mockAuthState = { role: "SECRETARY", accessToken: "token" };
    render(
      <ToastProvider>
        <EditModeProvider>
          <PageOverridesProvider page="about" overrides={{}}>
            <EditableText contentKey="hero.title" defaultValue="Default Title" as="h1" />
          </PageOverridesProvider>
        </EditModeProvider>
      </ToastProvider>,
    );

    expect(screen.getByRole("heading", { name: "Default Title" })).toBeInTheDocument();
  });

  it("stays a real heading (not role=button) even when Edit Mode is active — heading navigation for screen readers must not break while editing", () => {
    mockAuthState = { role: "SECRETARY", accessToken: "token" };
    renderField();
    // Preserving the native heading role, not stamping role="button" over
    // it, is the whole point of this test — see editable-text.tsx's own
    // doc comment on why.
    expect(screen.getByRole("heading", { name: "Default Title" })).toBeInTheDocument();
  });

  it("renders plainly with no click affordance if the viewer isn't a Secretary, even with Edit Mode active", () => {
    mockAuthState = { role: "STUDENT", accessToken: "token" };
    renderField();
    const heading = screen.getByRole("heading", { name: "Default Title" });
    expect(heading).not.toHaveAttribute("tabindex");
  });

  it("a Secretary with Edit Mode active can click the field to start editing", async () => {
    mockAuthState = { role: "SECRETARY", accessToken: "token" };
    const user = userEvent.setup();
    renderField();

    await user.click(screen.getByRole("heading", { name: "Default Title" }));
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("Save persists the new value", async () => {
    mockAuthState = { role: "SECRETARY", accessToken: "token" };
    putMock.mockResolvedValue({});
    const user = userEvent.setup();
    renderField();

    await user.click(screen.getByRole("heading", { name: "Default Title" }));
    const textarea = screen.getByRole("textbox");
    await user.clear(textarea);
    await user.type(textarea, "Edited Title");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(putMock).toHaveBeenCalledWith("/api/content-overrides/about/hero.title", { type: "TEXT", textValue: "Edited Title" }, "token"));
    expect(screen.getByRole("heading", { name: "Edited Title" })).toBeInTheDocument();
  });

  it("shows Reset to original only when an override already exists, and it locally restores the default (the reset itself is staged, not yet published)", async () => {
    mockAuthState = { role: "SECRETARY", accessToken: "token" };
    deleteMock.mockResolvedValue({});
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <ActiveEditModeHarness>
          <PageOverridesProvider page="about" overrides={{ "hero.title": { textValue: "Already Overridden" } } as never}>
            <EditableText contentKey="hero.title" defaultValue="Default Title" as="h1" />
          </PageOverridesProvider>
        </ActiveEditModeHarness>
      </ToastProvider>,
    );

    await user.click(screen.getByRole("heading", { name: "Already Overridden" }));
    const resetButton = screen.getByRole("button", { name: /reset to original/i });
    await user.click(resetButton);

    await waitFor(() => expect(deleteMock).toHaveBeenCalledWith("/api/content-overrides/about/hero.title", "token"));
    expect(screen.getByRole("heading", { name: "Default Title" })).toBeInTheDocument();
  });

  it("Cancel discards the draft without saving", async () => {
    mockAuthState = { role: "SECRETARY", accessToken: "token" };
    const user = userEvent.setup();
    renderField();

    await user.click(screen.getByRole("heading", { name: "Default Title" }));
    const textarea = screen.getByRole("textbox");
    await user.clear(textarea);
    await user.type(textarea, "Unsaved");
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(putMock).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Default Title" })).toBeInTheDocument();
  });
});

describe("EditableText — draft never leaks into normal view; Preview and Discard", () => {
  beforeEach(() => {
    putMock.mockClear();
    deleteMock.mockClear();
    getMock.mockClear();
  });

  function PreviewToggle() {
    const { togglePreview } = useEditMode();
    return (
      <button type="button" onClick={togglePreview}>
        Toggle Preview
      </button>
    );
  }

  function DiscardTrigger() {
    const { bumpDiscardGeneration } = useEditMode();
    return (
      <button type="button" onClick={bumpDiscardGeneration}>
        Simulate Discard
      </button>
    );
  }

  it("a pending draft is invisible outside Preview, even though it exists server-side", async () => {
    mockAuthState = { role: "SECRETARY", accessToken: "token" };
    getMock.mockResolvedValue({ "hero.title": { type: "TEXT", textValue: "Pending Draft Title", fileId: null } });

    render(
      <ToastProvider>
        <ActiveEditModeHarness>
          <PageOverridesProvider page="about" overrides={{ "hero.title": { textValue: "Published Title" } } as never}>
            <EditableText contentKey="hero.title" defaultValue="Default Title" as="h1" />
          </PageOverridesProvider>
        </ActiveEditModeHarness>
      </ToastProvider>,
    );

    expect(screen.getByRole("heading", { name: "Published Title" })).toBeInTheDocument();
    expect(screen.queryByText("Pending Draft Title")).not.toBeInTheDocument();
  });

  it("entering Preview surfaces the pending draft; exiting restores the published value", async () => {
    mockAuthState = { role: "SECRETARY", accessToken: "token" };
    getMock.mockResolvedValue({ "hero.title": { type: "TEXT", textValue: "Pending Draft Title", fileId: null } });
    const user = userEvent.setup();

    render(
      <ToastProvider>
        <ActiveEditModeHarness>
          <PreviewToggle />
          <PageOverridesProvider page="about" overrides={{ "hero.title": { textValue: "Published Title" } } as never}>
            <EditableText contentKey="hero.title" defaultValue="Default Title" as="h1" />
          </PageOverridesProvider>
        </ActiveEditModeHarness>
      </ToastProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Toggle Preview" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Pending Draft Title" })).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Toggle Preview" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Published Title" })).toBeInTheDocument());
  });

  it("Discard reverts even a locally-just-edited field back to the last published value", async () => {
    mockAuthState = { role: "SECRETARY", accessToken: "token" };
    putMock.mockResolvedValue({});
    const user = userEvent.setup();

    render(
      <ToastProvider>
        <ActiveEditModeHarness>
          <DiscardTrigger />
          <PageOverridesProvider page="about" overrides={{ "hero.title": { textValue: "Published Title" } } as never}>
            <EditableText contentKey="hero.title" defaultValue="Default Title" as="h1" />
          </PageOverridesProvider>
        </ActiveEditModeHarness>
      </ToastProvider>,
    );

    await user.click(screen.getByRole("heading", { name: "Published Title" }));
    const textarea = screen.getByRole("textbox");
    await user.clear(textarea);
    await user.type(textarea, "My Unpublished Edit");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "My Unpublished Edit" })).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Simulate Discard" }));
    expect(screen.getByRole("heading", { name: "Published Title" })).toBeInTheDocument();
  });
});
