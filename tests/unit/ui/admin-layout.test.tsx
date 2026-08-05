// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const replaceMock = vi.fn();
let mockAuthState: {
  isLoading: boolean;
  isAuthenticated: boolean;
  role: string | null;
  logout: () => Promise<void>;
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
  usePathname: () => "/dashboard",
}));

vi.mock("@/modules/auth/client", () => ({
  useAuth: () => mockAuthState,
}));

import AdminLayout from "../../../src/app/(admin)/layout";

describe("AdminLayout — dashboard authorization (UI-level route protection)", () => {
  beforeEach(() => {
    replaceMock.mockClear();
  });

  it("shows a loading state and does not redirect while auth status is resolving", () => {
    mockAuthState = { isLoading: true, isAuthenticated: false, role: null, logout: vi.fn() };
    render(<AdminLayout>{"content"}</AdminLayout>);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("redirects to /login when not authenticated", async () => {
    mockAuthState = { isLoading: false, isAuthenticated: false, role: null, logout: vi.fn() };
    render(<AdminLayout>{"content"}</AdminLayout>);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/login"));
  });

  it("redirects to /login for a Student role (this dashboard is Secretary/Coordinator only)", async () => {
    mockAuthState = { isLoading: false, isAuthenticated: true, role: "STUDENT", logout: vi.fn() };
    render(<AdminLayout>{"content"}</AdminLayout>);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/login"));
  });

  it("redirects to /login for a Recruiter role", async () => {
    mockAuthState = { isLoading: false, isAuthenticated: true, role: "RECRUITER", logout: vi.fn() };
    render(<AdminLayout>{"content"}</AdminLayout>);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/login"));
  });

  it("renders the dashboard shell and children for the Secretary — no redirect", async () => {
    mockAuthState = { isLoading: false, isAuthenticated: true, role: "SECRETARY", logout: vi.fn() };
    render(<AdminLayout>{"dashboard content"}</AdminLayout>);

    expect(await screen.findByText("dashboard content")).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("renders the dashboard shell for a Coordinator — no redirect", async () => {
    mockAuthState = { isLoading: false, isAuthenticated: true, role: "COORDINATOR", logout: vi.fn() };
    render(<AdminLayout>{"dashboard content"}</AdminLayout>);

    expect(await screen.findByText("dashboard content")).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });
});
