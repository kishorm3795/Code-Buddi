import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useShare } from "./useShare";
import { apiClient } from "../api/client";
import Swal from "sweetalert2";

const mockNavigate = vi.fn();

vi.mock("../api/client", () => ({
  apiClient: vi.fn(),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("./useAuth", () => ({
  useAuth: vi.fn(() => ({
    isLoggedIn: true,
    token: "mock-token",
  })),
}));

vi.mock("./useUsageCounts", () => ({
  useUsageCounts: vi.fn(() => ({
    saveSharedLinkCount: vi.fn().mockResolvedValue(true),
  })),
}));

describe("useShare", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles sharing code successfully and navigating", async () => {
    vi.spyOn(Swal, "fire").mockResolvedValue({ isDismissed: false, isConfirmed: true });

    apiClient.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        fileUrl: "http://localhost:5002/python-a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      }),
    });

    const { result } = renderHook(() => useShare());

    let shareResult;
    await act(async () => {
      shareResult = await result.current.shareCode({
        code: "print('hello')",
        language: "python",
      });
    });

    expect(shareResult).not.toBeNull();
    expect(shareResult.shareId).toBe("python-a1b2c3d4-e5f6-7890-abcd-ef1234567890");
    expect(mockNavigate).toHaveBeenCalledWith("/python-a1b2c3d4-e5f6-7890-abcd-ef1234567890");
  });

  it("blocks sharing when code is empty", async () => {
    const swalSpy = vi.spyOn(Swal, "fire");
    const { result } = renderHook(() => useShare());

    let shareResult;
    await act(async () => {
      shareResult = await result.current.shareCode({
        code: "   ",
        language: "python",
      });
    });

    expect(shareResult).toBeNull();
    expect(swalSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Missing Information",
      })
    );
  });
});
