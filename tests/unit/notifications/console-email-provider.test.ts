import { describe, expect, it, vi } from "vitest";
import { ConsoleEmailProvider } from "../../../src/modules/notifications/infrastructure/console-email-provider";

describe("ConsoleEmailProvider — Version 1.0 dev logger", () => {
  it("logs the message instead of sending it, and never throws", async () => {
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
    const provider = new ConsoleEmailProvider();

    await expect(
      provider.send({ to: "alice@vnit.ac.in", subject: "Hello", text: "Hi Alice", html: "<p>Hi Alice</p>" }),
    ).resolves.toBeUndefined();

    expect(consoleLog).toHaveBeenCalledTimes(1);
    const [logged] = consoleLog.mock.calls[0]!;
    expect(logged).toContain("alice@vnit.ac.in");
    expect(logged).toContain("Hello");
    consoleLog.mockRestore();
  });
});
