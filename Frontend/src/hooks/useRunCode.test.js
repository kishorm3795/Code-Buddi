import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRunCode } from "./useRunCode";
import { apiClient } from "../api/client";

vi.mock("../api/client", () => ({
  apiClient: vi.fn(),
}));

vi.mock("./useUsageCounts", () => ({
  useUsageCounts: vi.fn(() => ({
    incrementRunCount: vi.fn(),
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

describe("useRunCode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it("streams output and labels as AI-simulated when header is present", async () => {
    const stream = createMockStream(["Hello, ", "world!\n"]);
    const headers = new Headers();
    headers.set("x-ai-simulated", "true");

    apiClient.mockResolvedValueOnce({
      ok: true,
      headers,
      body: stream,
    });

    const { result } = renderHook(() => useRunCode());

    await act(async () => {
      await result.current.runCode({
        code: "print('Hello, world!')",
        language: "python",
      });
    });

    expect(result.current.isSimulated).toBe(true);
    expect(result.current.output).toContain("Hello, world!");
    expect(result.current.output).toContain("Completed @");
    expect(result.current.error).toBeNull();
  });

  it("handles streaming cancellation via cancelRun", async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("chunk 1"));
      },
    });

    apiClient.mockResolvedValueOnce({
      ok: true,
      headers: new Headers(),
      body: stream,
    });

    const { result } = renderHook(() => useRunCode());

    act(() => {
      result.current.runCode({
        code: "print('test')",
        language: "python",
      });
    });

    act(() => {
      result.current.cancelRun();
    });

    expect(result.current.isRunning).toBe(false);
    expect(result.current.output).toContain("[Execution cancelled by user]");
  });

  it("detects backend error marker in stream and sets error state", async () => {
    const stream = createMockStream([
      "Traceback (most recent call last):\n",
      "\n[Generation Error: Gemini quota exceeded]",
    ]);

    apiClient.mockResolvedValueOnce({
      ok: true,
      headers: new Headers(),
      body: stream,
    });

    const { result } = renderHook(() => useRunCode());

    await act(async () => {
      await result.current.runCode({
        code: "def error(): pass",
        language: "python",
      });
    });

    expect(result.current.error).toBe("Gemini quota exceeded");
  });

  it("clears output correctly", () => {
    const { result } = renderHook(() =>
      useRunCode({ defaultOutput: "Previous result" })
    );

    expect(result.current.output).toBe("Previous result");

    act(() => {
      result.current.clearOutput();
    });

    expect(result.current.output).toBe("");
    expect(result.current.isSimulated).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
