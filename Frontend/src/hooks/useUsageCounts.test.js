import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useUsageCounts } from "./useUsageCounts";
import { apiClient } from "../api/client";

vi.mock("../api/client", () => ({
  apiClient: vi.fn(),
}));

vi.mock("./useAuth", () => ({
  useAuth: vi.fn(() => ({
    isLoggedIn: true,
    token: "mock-token",
  })),
}));

describe("useUsageCounts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("increments run count with language payload", async () => {
    apiClient.mockResolvedValueOnce({ ok: true, status: 200 });

    const { result } = renderHook(() => useUsageCounts());
    await act(async () => {
      await result.current.incrementRunCount("python");
    });

    expect(apiClient).toHaveBeenCalledWith(
      expect.stringContaining("/api/runCode/count"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ language: "python" }),
      })
    );
  });

  it("increments generate code count", async () => {
    apiClient.mockResolvedValueOnce({ ok: true, status: 200 });

    const { result } = renderHook(() => useUsageCounts());
    await act(async () => {
      await result.current.incrementGenerateCount();
    });

    expect(apiClient).toHaveBeenCalledWith(
      expect.stringContaining("/api/generateCode/count"),
      expect.objectContaining({ method: "POST" })
    );
  });

  it("increments refactor code count", async () => {
    apiClient.mockResolvedValueOnce({ ok: true, status: 200 });

    const { result } = renderHook(() => useUsageCounts());
    await act(async () => {
      await result.current.incrementRefactorCount();
    });

    expect(apiClient).toHaveBeenCalledWith(
      expect.stringContaining("/api/refactorCode/count"),
      expect.objectContaining({ method: "POST" })
    );
  });

  it("saves shared link count with shareId and metadata", async () => {
    apiClient.mockResolvedValueOnce({ ok: true, status: 200 });

    const { result } = renderHook(() => useUsageCounts());
    let success;
    await act(async () => {
      success = await result.current.saveSharedLinkCount("python-123", "My Python Code", 30);
    });

    expect(success).toBe(true);
    expect(apiClient).toHaveBeenCalledWith(
      expect.stringContaining("/api/sharedLink/count"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          shareId: "python-123",
          title: "My Python Code",
          expiryTime: 30,
        }),
      })
    );
  });
});
