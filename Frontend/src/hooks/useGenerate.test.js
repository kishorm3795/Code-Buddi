import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGenerate } from "./useGenerate";
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
    incrementGenerateCount: vi.fn(),
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

describe("useGenerate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles successful streaming code generation", async () => {
    vi.spyOn(Swal, "fire").mockResolvedValueOnce({
      value: { prompt: "write a calculator", improve: false },
    });

    const stream = createMockStream(["def add(a, b):\n", "    return a + b\n"]);
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

    const { result } = renderHook(() => useGenerate());

    await act(async () => {
      await result.current.generateCode({
        language: "python",
        setCode,
      });
    });

    expect(setCode).toHaveBeenCalled();
    expect(currentCode).toContain("def add(a, b):");
    expect(result.current.isGenerating).toBe(false);
  });

  it("detects backend error marker and alerts user", async () => {
    vi.spyOn(Swal, "fire").mockResolvedValueOnce({
      value: { prompt: "problem description", improve: false },
    });

    const stream = createMockStream([
      "def partial():\n",
      "\n[Generation Error: Backend server overloaded]",
    ]);
    apiClient.mockResolvedValueOnce({
      ok: true,
      headers: new Headers(),
      body: stream,
    });

    const setCode = vi.fn();
    const { result } = renderHook(() => useGenerate());

    await act(async () => {
      await result.current.generateCode({
        language: "python",
        setCode,
      });
    });

    expect(result.current.error).toBe("Backend server overloaded");
    expect(setCode).toHaveBeenCalledWith("");
  });

  it("supports cancelling ongoing generation", () => {
    const { result } = renderHook(() => useGenerate());

    act(() => {
      result.current.cancelGenerate();
    });

    expect(result.current.isGenerating).toBe(false);
    expect(result.current.loadingAction).toBeNull();
  });
});
