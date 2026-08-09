// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  usePathname: () => "/student",
}));

vi.mock("@/modules/auth/client", () => ({
  useAuth: () => mockAuthState,
}));

import StudentLayout from "../../../src/app/(student)/layout";

describe("StudentLayout — Student-only route protection", () => {
  beforeEach(() => {
    replaceMock.mockClear();
  });

  it("shows a loading state and does not redirect while auth status is resolving", () => {
    mockAuthState = { isLoading: true, isAuthenticated: false, role: null, logout: vi.fn() };
    render(<StudentLayout>{"content"}</StudentLayout>);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("redirects to /login when not authenticated", async () => {
    mockAuthState = { isLoading: false, isAuthenticated: false, role: null, logout: vi.fn() };
    render(<StudentLayout>{"content"}</StudentLayout>);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/login"));
  });

  it("redirects a Secretary to /login — this portal is Student-only", async () => {
    mockAuthState = { isLoading: false, isAuthenticated: true, role: "SECRETARY", logout: vi.fn() };
    render(<StudentLayout>{"content"}</StudentLayout>);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/login"));
  });

  it("redirects a Recruiter to /login", async () => {
    mockAuthState = { isLoading: false, isAuthenticated: true, role: "RECRUITER", logout: vi.fn() };
    render(<StudentLayout>{"content"}</StudentLayout>);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/login"));
  });

  it("renders the portal shell and children for a Student — no redirect", async () => {
    mockAuthState = { isLoading: false, isAuthenticated: true, role: "STUDENT", logout: vi.fn() };
    render(<StudentLayout>{"student content"}</StudentLayout>);

    expect(await screen.findByText("student content")).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("links to /student/applications (V4.0 D2)", async () => {
    mockAuthState = { isLoading: false, isAuthenticated: true, role: "STUDENT", logout: vi.fn() };
    render(<StudentLayout>{"student content"}</StudentLayout>);

    await screen.findByText("student content");
    expect(screen.getByRole("link", { name: /applications/i })).toHaveAttribute("href", "/student/applications");
  });

  it("links to /student/interests (V4.0 C3)", async () => {
    mockAuthState = { isLoading: false, isAuthenticated: true, role: "STUDENT", logout: vi.fn() };
    render(<StudentLayout>{"student content"}</StudentLayout>);

    await screen.findByText("student content");
    expect(screen.getByRole("link", { name: /interests/i })).toHaveAttribute("href", "/student/interests");
  });

  it("links Overview to /student and My Profile to /student/profile (V4.0 D6 — career hub split)", async () => {
    mockAuthState = { isLoading: false, isAuthenticated: true, role: "STUDENT", logout: vi.fn() };
    render(<StudentLayout>{"student content"}</StudentLayout>);

    await screen.findByText("student content");
    expect(screen.getByRole("link", { name: /^overview$/i })).toHaveAttribute("href", "/student");
    expect(screen.getByRole("link", { name: /^my profile$/i })).toHaveAttribute("href", "/student/profile");
  });

  it("offers Account Settings from the user menu, linking to /student/account (V4.0 A3 parity fix)", async () => {
    mockAuthState = { isLoading: false, isAuthenticated: true, role: "STUDENT", logout: vi.fn() };
    const user = userEvent.setup();
    render(<StudentLayout>{"student content"}</StudentLayout>);

    await screen.findByText("student content");
    await user.click(screen.getByRole("button", { name: /account menu/i }));

    expect(screen.getByRole("link", { name: /account settings/i })).toHaveAttribute("href", "/student/account");
  });
});
