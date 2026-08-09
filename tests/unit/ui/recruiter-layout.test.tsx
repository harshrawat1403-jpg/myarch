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
  usePathname: () => "/recruiter",
}));

vi.mock("@/modules/auth/client", () => ({
  useAuth: () => mockAuthState,
}));

import RecruiterLayout from "../../../src/app/(recruiter)/layout";

describe("RecruiterLayout — isolation from the admin dashboard", () => {
  beforeEach(() => {
    replaceMock.mockClear();
  });

  it("shows a loading state and does not redirect while auth status is resolving", () => {
    mockAuthState = { isLoading: true, isAuthenticated: false, role: null, logout: vi.fn() };
    render(<RecruiterLayout>{"content"}</RecruiterLayout>);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("redirects to /login when not authenticated", async () => {
    mockAuthState = { isLoading: false, isAuthenticated: false, role: null, logout: vi.fn() };
    render(<RecruiterLayout>{"content"}</RecruiterLayout>);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/login"));
  });

  it("redirects a Secretary to /login — the recruiter portal is isolated from admin roles", async () => {
    mockAuthState = { isLoading: false, isAuthenticated: true, role: "SECRETARY", logout: vi.fn() };
    render(<RecruiterLayout>{"content"}</RecruiterLayout>);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/login"));
  });

  it("redirects a Coordinator to /login", async () => {
    mockAuthState = { isLoading: false, isAuthenticated: true, role: "COORDINATOR", logout: vi.fn() };
    render(<RecruiterLayout>{"content"}</RecruiterLayout>);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/login"));
  });

  it("redirects a Student to /login", async () => {
    mockAuthState = { isLoading: false, isAuthenticated: true, role: "STUDENT", logout: vi.fn() };
    render(<RecruiterLayout>{"content"}</RecruiterLayout>);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/login"));
  });

  it("renders the portal shell and children for a Recruiter — no redirect", async () => {
    mockAuthState = { isLoading: false, isAuthenticated: true, role: "RECRUITER", logout: vi.fn() };
    render(<RecruiterLayout>{"recruiter content"}</RecruiterLayout>);

    expect(await screen.findByText("recruiter content")).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("links Dashboard, Student Directory, Saved, and Interests (V4.0 C4)", async () => {
    mockAuthState = { isLoading: false, isAuthenticated: true, role: "RECRUITER", logout: vi.fn() };
    render(<RecruiterLayout>{"recruiter content"}</RecruiterLayout>);

    await screen.findByText("recruiter content");
    expect(screen.getByRole("link", { name: /^dashboard$/i })).toHaveAttribute("href", "/recruiter");
    expect(screen.getByRole("link", { name: /student directory/i })).toHaveAttribute("href", "/recruiter/directory");
    expect(screen.getByRole("link", { name: /^saved$/i })).toHaveAttribute("href", "/recruiter/saved");
    expect(screen.getByRole("link", { name: /^interests$/i })).toHaveAttribute("href", "/recruiter/interests");
  });
});
