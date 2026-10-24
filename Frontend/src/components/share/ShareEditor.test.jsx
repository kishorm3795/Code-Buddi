import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ShareEditor from "../ShareEditor";
import { apiClient } from "../../api/client";

vi.mock("../../api/client", () => ({
  apiClient: vi.fn(),
}));

vi.mock("../../hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({
    isLoggedIn: false,
    token: null,
  })),
}));

// Mock CodeEditor and Editor to ensure no innerHTML is injected
vi.mock("../CodeEditor", () => ({
  default: ({ defaultCode, language }) => (
    <div data-testid="mock-code-editor" data-language={language}>
      {defaultCode}
    </div>
  ),
}));

vi.mock("../Editor", () => ({
  default: ({ value }) => (
    <div data-testid="mock-html-editor">
      {typeof value === "object" ? JSON.stringify(value) : value}
    </div>
  ),
}));

describe("ShareEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it("renders dedicated LinkExpiredScreen when backend returns 410", async () => {
    apiClient.mockResolvedValueOnce({
      ok: false,
      status: 410,
      json: async () => ({ error: "File has expired" }),
    });

    render(
      <MemoryRouter initialEntries={["/python-11111111-2222-3333-4444-555555555555"]}>
        <Routes>
          <Route path="/:shareId" element={<ShareEditor isDarkMode={false} />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("link-expired-screen")).toBeInTheDocument();
      expect(screen.getByText(/Shared Link Expired \(410\)/i)).toBeInTheDocument();
    });
  });

  it("renders dedicated LinkNotFoundScreen when backend returns 404", async () => {
    apiClient.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: "File not found" }),
    });

    render(
      <MemoryRouter initialEntries={["/python-11111111-2222-3333-4444-555555555555"]}>
        <Routes>
          <Route path="/:shareId" element={<ShareEditor isDarkMode={false} />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("link-not-found-screen")).toBeInTheDocument();
      expect(screen.getByText(/Shared Link Not Found \(404\)/i)).toBeInTheDocument();
    });
  });

  it("renders dedicated LinkNotFoundScreen for invalid UUID format", async () => {
    render(
      <MemoryRouter initialEntries={["/invalid-non-uuid-path"]}>
        <Routes>
          <Route path="/:shareId" element={<ShareEditor isDarkMode={false} />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("link-not-found-screen")).toBeInTheDocument();
    });
  });

  it("renders shared code safely without innerHTML or dangerouslySetInnerHTML", async () => {
    const maliciousCode = '<script>alert("xss")</script><img src=x onerror=alert(1)>';
    apiClient.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        code: maliciousCode,
        language: "python",
        title: "Security Benchmark",
        expiry_time: new Date(Date.now() + 3600000).toISOString(),
      }),
    });

    const { container } = render(
      <MemoryRouter initialEntries={["/python-11111111-2222-3333-4444-555555555555"]}>
        <Routes>
          <Route path="/:shareId" element={<ShareEditor isDarkMode={false} />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("mock-code-editor")).toBeInTheDocument();
    });

    // Verify no script tags or executed img elements were injected into DOM
    expect(container.querySelectorAll("script").length).toBe(0);
    expect(container.querySelectorAll("img").length).toBe(0);
    // Raw text is preserved securely as plain text
    expect(screen.getByTestId("mock-code-editor")).toHaveTextContent(maliciousCode);
  });
});
