// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../../src/lib/api-client";

const pushMock = vi.fn();
const loginMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/modules/auth/client", () => ({
  useAuth: () => ({ login: loginMock }),
}));

import LoginPage from "../../../src/app/(public)/login/page";

describe("LoginPage — UI integration", () => {
  beforeEach(() => {
    pushMock.mockClear();
    loginMock.mockClear();
  });

  it("submits the entered credentials and redirects a Secretary to the admin dashboard", async () => {
    loginMock.mockResolvedValueOnce({ role: "SECRETARY" });
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), "secretary@example.edu");
    await user.type(screen.getByLabelText(/password/i), "correct-password");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith("secretary@example.edu", "correct-password");
    });
    expect(pushMock).toHaveBeenCalledWith("/dashboard");
  });

  it("redirects a Coordinator to the admin dashboard", async () => {
    loginMock.mockResolvedValueOnce({ role: "COORDINATOR" });
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), "coord@example.edu");
    await user.type(screen.getByLabelText(/password/i), "correct-password");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/dashboard"));
  });

  it("redirects a Recruiter to the isolated recruiter portal, never the admin dashboard", async () => {
    loginMock.mockResolvedValueOnce({ role: "RECRUITER" });
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), "recruiter@example.com");
    await user.type(screen.getByLabelText(/password/i), "correct-password");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/recruiter"));
    expect(pushMock).not.toHaveBeenCalledWith("/dashboard");
  });

  it("does not redirect a Student anywhere (self-service portal not yet built)", async () => {
    loginMock.mockResolvedValueOnce({ role: "STUDENT" });
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), "student@example.edu");
    await user.type(screen.getByLabelText(/password/i), "correct-password");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await screen.findByText(/not yet available/i);
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("shows the server's error message and does not redirect on failed login", async () => {
    loginMock.mockRejectedValueOnce(new ApiError(401, "UNAUTHORIZED", "Invalid email or password"));
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), "secretary@example.edu");
    await user.type(screen.getByLabelText(/password/i), "wrong-password");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText("Invalid email or password")).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
