import { afterEach, describe, expect, it, vi } from "vitest";
import { ResendEmailProvider } from "../../../src/modules/notifications/infrastructure/resend-email-provider";

const MESSAGE = { to: "student@myarch.in", subject: "Subject", text: "Text body", html: "<p>Text body</p>" };

describe("ResendEmailProvider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("POSTs to Resend's API with the bearer token and the rendered message", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const provider = new ResendEmailProvider("re_test_key", "noreply@myarch.in");
    await provider.send(MESSAGE);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer re_test_key");
    expect(JSON.parse(init.body)).toEqual({
      from: "noreply@myarch.in",
      to: MESSAGE.to,
      subject: MESSAGE.subject,
      text: MESSAGE.text,
      html: MESSAGE.html,
    });
  });

  it("throws when Resend responds with a non-2xx status, including the status and response body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("invalid recipient", { status: 422 })),
    );

    const provider = new ResendEmailProvider("re_test_key", "noreply@myarch.in");
    await expect(provider.send(MESSAGE)).rejects.toThrow(/422/);
  });

  it("never includes the API key in a thrown error's message", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("unauthorized", { status: 401 })));

    const provider = new ResendEmailProvider("re_super_secret_key", "noreply@myarch.in");
    const error = await provider.send(MESSAGE).catch((err: unknown) => err as Error);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).not.toContain("re_super_secret_key");
  });
});
