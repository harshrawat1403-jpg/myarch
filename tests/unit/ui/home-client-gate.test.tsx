// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const replaceMock = vi.fn();
let mockAuthState: { isLoading: boolean; isAuthenticated: boolean; role: string | null };

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

vi.mock("@/modules/auth/client", () => ({
  useAuth: () => mockAuthState,
}));

import { HomeClientGate } from "../../../src/app/(marketing)/home-client-gate";

describe("HomeClientGate — the `/` auth-redirect gate (MYARCH Edit Mode)", () => {
  beforeEach(() => {
    replaceMock.mockClear();
  });

  it("shows a loading state and does not redirect while auth status is resolving", () => {
    mockAuthState = { isLoading: true, isAuthenticated: false, role: null };
    render(<HomeClientGate>{"marketing content"}</HomeClientGate>);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("redirects a Secretary to /dashboard instead of showing marketing content", async () => {
    mockAuthState = { isLoading: false, isAuthenticated: true, role: "SECRETARY" };
    render(<HomeClientGate>{"marketing content"}</HomeClientGate>);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/dashboard"));
    expect(screen.queryByText("marketing content")).not.toBeInTheDocument();
  });

  it("redirects a Coordinator to /dashboard", async () => {
    mockAuthState = { isLoading: false, isAuthenticated: true, role: "COORDINATOR" };
    render(<HomeClientGate>{"marketing content"}</HomeClientGate>);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/dashboard"));
  });

  it("redirects a Student to /student", async () => {
    mockAuthState = { isLoading: false, isAuthenticated: true, role: "STUDENT" };
    render(<HomeClientGate>{"marketing content"}</HomeClientGate>);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/student"));
  });

  it("redirects a Recruiter to /recruiter", async () => {
    mockAuthState = { isLoading: false, isAuthenticated: true, role: "RECRUITER" };
    render(<HomeClientGate>{"marketing content"}</HomeClientGate>);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/recruiter"));
  });

  it("renders the marketing content for an unauthenticated visitor, without redirecting", () => {
    mockAuthState = { isLoading: false, isAuthenticated: false, role: null };
    render(<HomeClientGate>{"marketing content"}</HomeClientGate>);

    expect(replaceMock).not.toHaveBeenCalled();
    expect(screen.getByText("marketing content")).toBeInTheDocument();
  });
});
