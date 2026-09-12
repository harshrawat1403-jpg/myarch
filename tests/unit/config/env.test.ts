import { afterEach, describe, expect, it, vi } from "vitest";

const originalEnvironment = { ...process.env };

function setBaseEnvironment(): void {
  process.env = {
    DATABASE_URL: "postgresql://user:password@127.0.0.1:5432/myarch",
    JWT_ACCESS_SECRET: "a".repeat(32),
    JWT_REFRESH_SECRET: "b".repeat(32),
    NODE_ENV: "development",
  };
}

afterEach(() => {
  process.env = { ...originalEnvironment };
  vi.resetModules();
});

describe("environment validation", () => {
  it("does not require DIRECT_URL for local development runtime", async () => {
    setBaseEnvironment();
    const { getEnv } = await import("@/config/env");

    expect(getEnv().DIRECT_URL).toBeUndefined();
  });

  it("requires DIRECT_URL in production", async () => {
    setBaseEnvironment();
    Object.assign(process.env, { NODE_ENV: "production" });
    const { getEnv } = await import("@/config/env");

    expect(() => getEnv()).toThrow("DIRECT_URL is required when NODE_ENV=production");
  });

  it("accepts separate runtime and direct URLs in production", async () => {
    setBaseEnvironment();
    Object.assign(process.env, {
      NODE_ENV: "production",
      DIRECT_URL: "postgresql://user:password@127.0.0.1:5432/myarch_direct",
    });
    const { getEnv } = await import("@/config/env");

    expect(getEnv().DIRECT_URL).toBe(process.env.DIRECT_URL);
  });
});
