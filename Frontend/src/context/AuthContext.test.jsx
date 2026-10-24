import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import React from "react";
import { AuthProvider, useAuth } from "./AuthContext";
import {
  LOCAL_STORAGE_TOKEN_KEY,
  LOCAL_STORAGE_USERNAME_KEY,
  LOCAL_STORAGE_LOGIN_KEY,
  LOCAL_STORAGE_GOOGLE_USER,
} from "../utils/constants";

// Mock client so logout API call doesn't fail
vi.mock("../api/client", () => ({
  apiClient: vi.fn().mockResolvedValue({ ok: true }),
  clearAuthState: vi.fn(),
}));

import { apiClient, clearAuthState } from "../api/client";

const TestAuthConsumer = () => {
  const { isLoggedIn, token, username, isGoogleUser, login, logout, updateUsername } = useAuth();

  return (
    <div>
      <div data-testid="is-logged-in">{String(isLoggedIn)}</div>
      <div data-testid="token">{token || "none"}</div>
      <div data-testid="username">{username || "none"}</div>
      <div data-testid="is-google">{String(isGoogleUser)}</div>

      <button
        onClick={() =>
          login({
            token: "jwt-token-123",
            username: "alex_coder",
            isgoogleuser: false,
          })
        }
      >
        Trigger Login
      </button>

      <button onClick={() => logout()}>Trigger Logout</button>
      <button onClick={() => updateUsername("new_alex")}>Trigger Update Username</button>
    </div>
  );
};

describe("AuthContext and useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("initializes with unauthenticated state when localStorage is empty", () => {
    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId("is-logged-in").textContent).toBe("false");
    expect(screen.getByTestId("token").textContent).toBe("none");
    expect(screen.getByTestId("username").textContent).toBe("none");
  });

  it("initializes with authenticated state if localStorage has credentials", () => {
    localStorage.setItem(LOCAL_STORAGE_TOKEN_KEY, "saved-token");
    localStorage.setItem(LOCAL_STORAGE_USERNAME_KEY, "saved-user");
    localStorage.setItem(LOCAL_STORAGE_LOGIN_KEY, "true");

    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId("is-logged-in").textContent).toBe("true");
    expect(screen.getByTestId("token").textContent).toBe("saved-token");
    expect(screen.getByTestId("username").textContent).toBe("saved-user");
  });

  it("login() updates auth state and persists to localStorage", async () => {
    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    await act(async () => {
      screen.getByText("Trigger Login").click();
    });

    expect(screen.getByTestId("is-logged-in").textContent).toBe("true");
    expect(screen.getByTestId("token").textContent).toBe("jwt-token-123");
    expect(screen.getByTestId("username").textContent).toBe("alex_coder");
    expect(localStorage.getItem(LOCAL_STORAGE_TOKEN_KEY)).toBe("jwt-token-123");
    expect(localStorage.getItem(LOCAL_STORAGE_USERNAME_KEY)).toBe("alex_coder");
  });

  it("logout() calls backend logout with credentials include and clears state", async () => {
    localStorage.setItem(LOCAL_STORAGE_TOKEN_KEY, "jwt-token-123");
    localStorage.setItem(LOCAL_STORAGE_USERNAME_KEY, "alex_coder");
    localStorage.setItem(LOCAL_STORAGE_LOGIN_KEY, "true");

    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    await act(async () => {
      screen.getByText("Trigger Logout").click();
    });

    expect(apiClient).toHaveBeenCalledWith(
      expect.stringContaining("/api/logout"),
      expect.objectContaining({
        method: "POST",
        credentials: "include",
      })
    );
    expect(clearAuthState).toHaveBeenCalled();
    expect(screen.getByTestId("is-logged-in").textContent).toBe("false");
    expect(screen.getByTestId("token").textContent).toBe("none");
  });

  it("updateUsername() updates state and localStorage", async () => {
    localStorage.setItem(LOCAL_STORAGE_TOKEN_KEY, "jwt-token-123");
    localStorage.setItem(LOCAL_STORAGE_USERNAME_KEY, "alex_coder");
    localStorage.setItem(LOCAL_STORAGE_LOGIN_KEY, "true");

    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    await act(async () => {
      screen.getByText("Trigger Update Username").click();
    });

    expect(screen.getByTestId("username").textContent).toBe("new_alex");
    expect(localStorage.getItem(LOCAL_STORAGE_USERNAME_KEY)).toBe("new_alex");
  });

  it("listens to auth:logout event and resets state immediately", async () => {
    localStorage.setItem(LOCAL_STORAGE_TOKEN_KEY, "jwt-token-123");
    localStorage.setItem(LOCAL_STORAGE_USERNAME_KEY, "alex_coder");
    localStorage.setItem(LOCAL_STORAGE_LOGIN_KEY, "true");

    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId("is-logged-in").textContent).toBe("true");

    act(() => {
      window.dispatchEvent(new CustomEvent("auth:logout"));
    });

    expect(screen.getByTestId("is-logged-in").textContent).toBe("false");
    expect(screen.getByTestId("username").textContent).toBe("none");
  });
});
