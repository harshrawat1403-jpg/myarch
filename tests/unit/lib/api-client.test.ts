// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient, ApiError } from "../../../src/lib/api-client";

function jsonResponse(body: unknown, status = 200) {
  return { ok: status < 400, status, json: async () => body };
}

describe("apiClient.get — { data: <value> } envelope unwrapping", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    fetchMock.mockReset();
  });

  it("returns null (not the raw envelope) when the server legitimately responds with { data: null }", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: null }));
    const result = await apiClient.get("/api/maintenance/coordinator");
    expect(result).toBeNull();
  });

  it("still unwraps a present data payload", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: "coord-1" } }));
    const result = await apiClient.get("/api/maintenance/coordinator");
    expect(result).toEqual({ id: "coord-1" });
  });

  it("still throws ApiError on a non-ok response", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: { code: "FORBIDDEN", message: "nope" } }, 403));
    await expect(apiClient.get("/api/maintenance/coordinator")).rejects.toBeInstanceOf(ApiError);
  });
});
