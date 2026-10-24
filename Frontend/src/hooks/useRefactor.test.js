import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRefactor } from "./useRefactor";
import { apiClient } from "../api/client";
import Swal from "sweetalert2";

vi.mock("../api/client", () => ({
  apiClient: vi.fn(),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("./useAuth", () => ({
  useAuth: vi.fn(() => ({
    isLoggedIn: true,
    token: "mock-token",
  })),
}));

vi.mock("./useUsageCounts", () => ({
  useUsageCounts: vi.fn(() => ({
    incrementRefactorCount: vi.fn(),
  })),
}));

function createMockStream(chunks) {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
}

describe("useRefactor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles successful streaming code refactor", async () => {
    vi.spyOn(Swal, "fire").mockResolvedValueOnce({
      value: "optimize loop",
      isConfirmed: true,
    });

    const stream = createMockStream(["def optimized_sum(n):\n", "    return n * (n + 1) // 2\n"]);
    apiClient.mockResolvedValueOnce({
      ok: true,
      headers: new Headers(),
      body: stream,
    });

    let currentCode = "";
    const setCode = vi.fn((updater) => {
      if (typeof updater === "function") {
        currentCode = updater(currentCode);
      } else {
        currentCode = updater;
      }
    });

    const { result } = renderHook(() => useRefactor());

    await act(async () => {
      await result.current.refactorCode({
        code: "def slow_sum(n): pass",
        language: "python",
        output: "",
        setCode,
      });
    });

    expect(setCode).toHaveBeenCalled();
    expect(currentCode).toContain("optimized_sum");
    expect(result.current.isRefactoring).toBe(false);
  });

  it("detects backend error marker and alerts user", async () => {
    vi.spyOn(Swal, "fire").mockResolvedValueOnce({
      value: "remove comments",
      isConfirmed: true,
    });

    const stream = createMockStream([
      "def test():\n",
      "\n[Generation Error: Refactoring service unavailable]",
    ]);
    apiClient.mockResolvedValueOnce({
      ok: true,
      headers: new Headers(),
      body: stream,
    });

    const setCode = vi.fn();
    const { result } = renderHook(() => useRefactor());

    await act(async () => {
      await result.current.refactorCode({
        code: "def test(): # comment",
        language: "python",
        output: "",
        setCode,
      });
    });

    expect(result.current.error).toBe("Refactoring service unavailable");
  });

  it("supports cancelling ongoing refactoring", () => {
    const { result } = renderHook(() => useRefactor());

    act(() => {
      result.current.cancelRefactor();
    });

    expect(result.current.isRefactoring).toBe(false);
    expect(result.current.loadingAction).toBeNull();
  });
});
