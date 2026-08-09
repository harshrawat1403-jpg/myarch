// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();

vi.mock("@/modules/auth/client", () => ({
  useAuth: () => ({ accessToken: "test-access-token" }),
}));

import StudentInterestsPage from "../../../src/app/(student)/student/interests/page";
import { ToastProvider } from "../../../src/components/ui/toast";

function renderPage() {
  return render(
    <ToastProvider>
      <StudentInterestsPage />
    </ToastProvider>,
  );
}

function jsonResponse(body: unknown) {
  return { ok: true, status: 200, json: async () => ({ data: body }) };
}

const SENT_INTEREST = {
  id: "int-1",
  companyName: "Acme Architects",
  message: "Loved your portfolio.",
  status: "SENT" as const,
  sentAt: "2026-01-01T00:00:00.000Z",
  respondedAt: null,
};

describe("Student interests inbox — accept/decline (V4.0 C3)", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("shows an empty state when there are no interest requests", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([]));
    renderPage();

    expect(await screen.findByText(/no recruiters have expressed interest yet/i)).toBeInTheDocument();
  });

  it("lists a received interest request with company name, message, and status", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([SENT_INTEREST]));
    renderPage();

    expect(await screen.findByText("Acme Architects")).toBeInTheDocument();
    expect(screen.getByText("Loved your portfolio.")).toBeInTheDocument();
    expect(screen.getByText(/awaiting your response/i)).toBeInTheDocument();
  });

  it("never renders the recruiter's personal contact info anywhere", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([SENT_INTEREST]));
    renderPage();
    await screen.findByText("Acme Architects");

    for (const forbidden of [/@example\.com/i, /rec1@/i, /\+91/, /9999999999/]) {
      expect(screen.queryByText(forbidden)).not.toBeInTheDocument();
    }
  });

  it("accepts a request and shows the updated state", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([SENT_INTEREST]));
    fetchMock.mockResolvedValueOnce(jsonResponse({ ...SENT_INTEREST, status: "ACCEPTED", respondedAt: "2026-01-02T00:00:00.000Z" }));
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Acme Architects");

    await user.click(screen.getByRole("button", { name: /^accept$/i }));

    expect(await screen.findByText(/^accepted$/i)).toBeInTheDocument();
    const [url, init] = fetchMock.mock.calls[1]!;
    expect(url).toBe("/api/student/interests/int-1");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body)).toEqual({ decision: "ACCEPT" });
    expect(screen.queryByRole("button", { name: /^accept$/i })).not.toBeInTheDocument();
  });

  it("declines a request and shows the updated state", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([SENT_INTEREST]));
    fetchMock.mockResolvedValueOnce(jsonResponse({ ...SENT_INTEREST, status: "DECLINED", respondedAt: "2026-01-02T00:00:00.000Z" }));
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Acme Architects");

    await user.click(screen.getByRole("button", { name: /^decline$/i }));

    expect(await screen.findByText(/^declined$/i)).toBeInTheDocument();
    const [, init] = fetchMock.mock.calls[1]!;
    expect(JSON.parse(init.body)).toEqual({ decision: "DECLINE" });
  });

  it("does not show accept/decline actions for a request that already has a decision", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse([{ ...SENT_INTEREST, status: "ACCEPTED", respondedAt: "2026-01-02T00:00:00.000Z" }]),
    );
    renderPage();
    await screen.findByText("Acme Architects");

    expect(screen.queryByRole("button", { name: /^accept$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^decline$/i })).not.toBeInTheDocument();
  });
});
