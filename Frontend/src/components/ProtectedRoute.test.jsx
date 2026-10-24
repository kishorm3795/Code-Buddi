import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute, { PublicOnlyRoute } from "./ProtectedRoute";
import { AuthContext } from "../context/AuthContext";

const renderWithAuth = (
  ui,
  {
    isLoggedIn = false,
    loading = false,
    initialEntries = ["/protected"],
  } = {}
) => {
  const authValue = {
    isLoggedIn,
    isAuthenticated: isLoggedIn,
    loading,
    token: isLoggedIn ? "mock-token" : null,
    username: isLoggedIn ? "testuser" : "",
    isGoogleUser: false,
    login: vi.fn(),
    logout: vi.fn(),
    updateUsername: vi.fn(),
    checkAuth: vi.fn(),
  };

  return render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter initialEntries={initialEntries}>
        {ui}
      </MemoryRouter>
    </AuthContext.Provider>
  );
};

describe("ProtectedRoute component", () => {
  it("renders protected child when user is authenticated", () => {
    renderWithAuth(
      <Routes>
        <Route
          path="/protected"
          element={
            <ProtectedRoute>
              <div>Protected Content</div>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>,
      { isLoggedIn: true }
    );

    expect(screen.getByText("Protected Content")).toBeInTheDocument();
    expect(screen.queryByText("Login Page")).not.toBeInTheDocument();
  });

  it("renders element prop when user is authenticated", () => {
    renderWithAuth(
      <Routes>
        <Route
          path="/protected"
          element={<ProtectedRoute element={<div>Element Content</div>} />}
        />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>,
      { isLoggedIn: true }
    );

    expect(screen.getByText("Element Content")).toBeInTheDocument();
  });

  it("redirects unauthenticated user to /login", () => {
    renderWithAuth(
      <Routes>
        <Route
          path="/protected"
          element={
            <ProtectedRoute>
              <div>Protected Content</div>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>,
      { isLoggedIn: false }
    );

    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
    expect(screen.getByText("Login Page")).toBeInTheDocument();
  });

  it("renders loading indicator when auth is loading", () => {
    const { container } = renderWithAuth(
      <Routes>
        <Route
          path="/protected"
          element={
            <ProtectedRoute>
              <div>Protected Content</div>
            </ProtectedRoute>
          }
        />
      </Routes>,
      { isLoggedIn: false, loading: true }
    );

    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });
});

describe("PublicOnlyRoute component", () => {
  it("renders child when user is not authenticated", () => {
    renderWithAuth(
      <Routes>
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <div>Login Form</div>
            </PublicOnlyRoute>
          }
        />
        <Route path="/" element={<div>Home Page</div>} />
      </Routes>,
      { isLoggedIn: false, initialEntries: ["/login"] }
    );

    expect(screen.getByText("Login Form")).toBeInTheDocument();
    expect(screen.queryByText("Home Page")).not.toBeInTheDocument();
  });

  it("redirects authenticated user away from public route to home", () => {
    renderWithAuth(
      <Routes>
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <div>Login Form</div>
            </PublicOnlyRoute>
          }
        />
        <Route path="/" element={<div>Home Page</div>} />
      </Routes>,
      { isLoggedIn: true, initialEntries: ["/login"] }
    );

    expect(screen.queryByText("Login Form")).not.toBeInTheDocument();
    expect(screen.getByText("Home Page")).toBeInTheDocument();
  });
});
