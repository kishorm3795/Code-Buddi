import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { apiClient, clearAuthState, parseApiError } from "./client";
import {
  LOCAL_STORAGE_TOKEN_KEY,
  LOCAL_STORAGE_USERNAME_KEY,
  LOCAL_STORAGE_LOGIN_KEY,
  SESSION_STORAGE_SHARELINKS_KEY,
} from "../utils/constants";

describe("apiClient fetch wrapper", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    global.fetch = vi.fn();
    window.location.href = "http://localhost:5173/";
    window.location.pathname = "/";
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete window.grecaptcha;
  });

  it("sends credentials: 'include' by default for httpOnly cookies", async () => {
    global.fetch.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    );

    await apiClient("/api/test");

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/test",
      expect.objectContaining({
        credentials: "include",
      })
    );
  });

  it("attaches Authorization header if token exists in localStorage", async () => {
    localStorage.setItem(LOCAL_STORAGE_TOKEN_KEY, "test-jwt-token");

    global.fetch.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    );

    await apiClient("/api/protected");

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/protected",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-jwt-token",
        }),
      })
    );
  });

  it("attaches reCAPTCHA token to non-GET requests when grecaptcha is available", async () => {
    window.grecaptcha = {
      ready: (cb) => cb(),
      execute: vi.fn().mockResolvedValue("mock-recaptcha-token"),
    };

    global.fetch.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    );

    await apiClient("/api/submit", {
      method: "POST",
      body: JSON.stringify({ data: 123 }),
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/submit",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "X-Recaptcha-Token": "mock-recaptcha-token",
          "Content-Type": "application/json",
        }),
      })
    );
  });

  it("does not attach reCAPTCHA token to GET requests", async () => {
    window.grecaptcha = {
      ready: (cb) => cb(),
      execute: vi.fn().mockResolvedValue("mock-recaptcha-token"),
    };

    global.fetch.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    );

    await apiClient("/api/data", { method: "GET" });

    const callArgs = global.fetch.mock.calls[0][1];
    expect(callArgs.headers["X-Recaptcha-Token"]).toBeUndefined();
  });

  it("handles 401/403 on protected routes by clearing auth state and redirecting to /login", async () => {
    localStorage.setItem(LOCAL_STORAGE_TOKEN_KEY, "expired-token");
    localStorage.setItem(LOCAL_STORAGE_USERNAME_KEY, "john");
    localStorage.setItem(LOCAL_STORAGE_LOGIN_KEY, "true");
    sessionStorage.setItem(SESSION_STORAGE_SHARELINKS_KEY, "some-links");

    global.fetch.mockResolvedValue(
      new Response(JSON.stringify({ msg: "Token expired" }), {
        status: 401,
        statusText: "Unauthorized",
      })
    );

    const logoutEventSpy = vi.fn();
    window.addEventListener("auth:logout", logoutEventSpy);

    const response = await apiClient("/api/account-details", { method: "POST" });

    expect(response.status).toBe(401);
    expect(localStorage.getItem(LOCAL_STORAGE_TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(LOCAL_STORAGE_USERNAME_KEY)).toBeNull();
    expect(sessionStorage.getItem(SESSION_STORAGE_SHARELINKS_KEY)).toBeNull();
    expect(logoutEventSpy).toHaveBeenCalled();
    expect(window.location.href).toBe("/login");

    window.removeEventListener("auth:logout", logoutEventSpy);
  });

  it("does not redirect to /login on 401 if request is an auth endpoint", async () => {
    global.fetch.mockResolvedValue(
      new Response(JSON.stringify({ msg: "Invalid credentials" }), {
        status: 401,
        statusText: "Unauthorized",
      })
    );

    window.location.href = "http://localhost:5173/login";

    const response = await apiClient("/api/login", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com", password: "wrong" }),
    });

    expect(response.status).toBe(401);
    expect(window.location.href).toBe("http://localhost:5173/login");
  });

  it("consistently parses JSON errors into response.errorData and response.errorMessage", async () => {
    global.fetch.mockResolvedValue(
      new Response(JSON.stringify({ msg: "Custom error message" }), {
        status: 400,
        statusText: "Bad Request",
      })
    );

    const response = await apiClient("/api/something", { method: "POST" });

    expect(response.ok).toBe(false);
    expect(response.errorData).toEqual({ msg: "Custom error message" });
    expect(response.errorMessage).toBe("Custom error message");
  });

  it("handles 429 rate limit responses with a friendly message", async () => {
    global.fetch.mockResolvedValue(
      new Response(JSON.stringify({ msg: "Too many attempts, please try again after 15 minutes" }), {
        status: 429,
        statusText: "Too Many Requests",
      })
    );

    const response = await apiClient("/api/login", { method: "POST" });

    expect(response.status).toBe(429);
    expect(response.errorMessage).toBe(
      "Too many attempts, please try again after 15 minutes"
    );
  });

  it("parseApiError helper extracts message properly", async () => {
    const mockResponse = {
      status: 429,
      clone: () => ({
        json: async () => ({ msg: "Rate limited" }),
      }),
    };

    const msg = await parseApiError(mockResponse);
    expect(msg).toBe("Rate limited");
  });
});
