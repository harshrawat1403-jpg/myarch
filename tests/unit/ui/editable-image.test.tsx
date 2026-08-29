// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../../../src/components/ui/toast";
import { EditModeProvider, useEditMode } from "../../../src/components/edit-mode/edit-mode-context";
import { PageOverridesProvider } from "../../../src/components/edit-mode/page-overrides-context";
import { EditableImage } from "../../../src/components/edit-mode/editable-image";

let mockAuthState: { role: string | null; accessToken: string | null } = { role: null, accessToken: null };
const uploadMock = vi.fn();
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
    upload: (...args: unknown[]) => uploadMock(...args),
    put: (...args: unknown[]) => putMock(...args),
    delete: (...args: unknown[]) => deleteMock(...args),
  },
  ApiError: class ApiError extends Error {},
}));

function AutoActivate({ children }: { children: React.ReactNode }) {
  const { isActive, toggle } = useEditMode();
  useEffect(() => {
    if (!isActive) toggle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <>{children}</>;
}

function renderField(overrides: Record<string, { fileId: string | null }> = {}) {
  return render(
    <ToastProvider>
      <EditModeProvider>
        <AutoActivate>
          <PageOverridesProvider page="about" overrides={overrides as never}>
            <EditableImage contentKey="hero.image" fallback={<div data-testid="fallback-placeholder">fallback</div>} />
          </PageOverridesProvider>
        </AutoActivate>
      </EditModeProvider>
    </ToastProvider>,
  );
}

describe("EditableImage", () => {
  beforeEach(() => {
    uploadMock.mockClear();
    putMock.mockClear();
    deleteMock.mockClear();
    getMock.mockClear();
  });

  it("renders exactly the fallback when there's no override and Edit Mode is off", () => {
    mockAuthState = { role: "SECRETARY", accessToken: "token" };
    render(
      <ToastProvider>
        <EditModeProvider>
          <PageOverridesProvider page="about" overrides={{}}>
            <EditableImage contentKey="hero.image" fallback={<div data-testid="fallback-placeholder">fallback</div>} />
          </PageOverridesProvider>
        </EditModeProvider>
      </ToastProvider>,
    );

    expect(screen.getByTestId("fallback-placeholder")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /replace image/i })).not.toBeInTheDocument();
  });

  it("renders the overridden image instead of the fallback", () => {
    mockAuthState = { role: "SECRETARY", accessToken: "token" };
    render(
      <ToastProvider>
        <EditModeProvider>
          <PageOverridesProvider page="about" overrides={{ "hero.image": { fileId: "file-123" } } as never}>
            <EditableImage contentKey="hero.image" fallback={<div data-testid="fallback-placeholder">fallback</div>} />
          </PageOverridesProvider>
        </EditModeProvider>
      </ToastProvider>,
    );

    expect(screen.queryByTestId("fallback-placeholder")).not.toBeInTheDocument();
    // A decorative `alt=""` intentionally removes the "img" ARIA role
    // (matches the existing ImagePicker precedent) — queried directly.
    const img = document.querySelector("img");
    expect(img).toHaveAttribute("src", "/api/files/file-123");
  });

  it("a Secretary with Edit Mode active sees a Replace Image control", () => {
    mockAuthState = { role: "SECRETARY", accessToken: "token" };
    renderField();
    expect(screen.getByRole("button", { name: /replace image/i })).toBeInTheDocument();
  });

  it("does not show edit affordances for a non-Secretary even with Edit Mode active", () => {
    mockAuthState = { role: "STUDENT", accessToken: "token" };
    renderField();
    expect(screen.queryByRole("button", { name: /replace image/i })).not.toBeInTheDocument();
  });

  it("uploading a file replaces the image and saves the override", async () => {
    mockAuthState = { role: "SECRETARY", accessToken: "token" };
    uploadMock.mockResolvedValue({ fileId: "new-file-id" });
    putMock.mockResolvedValue({});
    const user = userEvent.setup();
    renderField();

    const file = new File(["fake-bytes"], "photo.jpg", { type: "image/jpeg" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, file);

    await waitFor(() => expect(uploadMock).toHaveBeenCalled());
    await waitFor(() => expect(putMock).toHaveBeenCalledWith("/api/content-overrides/about/hero.image", { type: "IMAGE", fileId: "new-file-id" }, "token"));
    await waitFor(() => expect(document.querySelector("img")).toHaveAttribute("src", "/api/files/new-file-id"));
  });

  it("Reset stages the removal and locally restores the fallback — never deletes the underlying file", async () => {
    mockAuthState = { role: "SECRETARY", accessToken: "token" };
    deleteMock.mockResolvedValue({});
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <EditModeProvider>
          <AutoActivate>
            <PageOverridesProvider page="about" overrides={{ "hero.image": { fileId: "file-123" } } as never}>
              <EditableImage contentKey="hero.image" fallback={<div data-testid="fallback-placeholder">fallback</div>} />
            </PageOverridesProvider>
          </AutoActivate>
        </EditModeProvider>
      </ToastProvider>,
    );

    await user.click(screen.getByRole("button", { name: /reset to original image/i }));

    await waitFor(() => expect(deleteMock).toHaveBeenCalledWith("/api/content-overrides/about/hero.image", "token"));
    await waitFor(() => expect(screen.getByTestId("fallback-placeholder")).toBeInTheDocument());
    // Only the override row is deleted (DELETE /api/content-overrides/**) —
    // no file-deletion call of any kind is ever made by this component.
  });
});
