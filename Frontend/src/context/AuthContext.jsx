import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  LOCAL_STORAGE_TOKEN_KEY,
  LOCAL_STORAGE_USERNAME_KEY,
  LOCAL_STORAGE_LOGIN_KEY,
  LOCAL_STORAGE_GOOGLE_USER,
  SESSION_STORAGE_SHARELINKS_KEY,
  SESSION_STORAGE_FETCH_STATUS_KEY,
  BACKEND_API_URL,
} from "../utils/constants";
import { apiClient, clearAuthState as clearStorageAuthState } from "../api/client";

export const AuthContext = createContext(null);

const getInitialAuthState = () => {
  try {
    if (typeof window === "undefined" || !window.localStorage) {
      return { token: null, username: "", isLoggedIn: false, isGoogleUser: false };
    }
    const token = localStorage.getItem(LOCAL_STORAGE_TOKEN_KEY) || null;
    const username = localStorage.getItem(LOCAL_STORAGE_USERNAME_KEY) || "";
    const loginFlag = localStorage.getItem(LOCAL_STORAGE_LOGIN_KEY);
    const isGoogle = localStorage.getItem(LOCAL_STORAGE_GOOGLE_USER) === "true";
    const isLoggedIn = !!(loginFlag === "true" || token);

    return { token, username, isLoggedIn, isGoogleUser: isGoogle };
  } catch {
    return { token: null, username: "", isLoggedIn: false, isGoogleUser: false };
  }
};

export const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState(getInitialAuthState);
  const [loading, setLoading] = useState(false);

  const login = useCallback((data) => {
    const token = data?.token || null;
    const username = data?.username || "";
    const isGoogleUser =
      data?.isgoogleuser === true ||
      data?.isgoogleuser === "true" ||
      data?.isGoogleUser === true;

    if (typeof window !== "undefined" && window.localStorage) {
      if (token) {
        localStorage.setItem(LOCAL_STORAGE_TOKEN_KEY, token);
      }
      localStorage.setItem(LOCAL_STORAGE_USERNAME_KEY, username);
      localStorage.setItem(LOCAL_STORAGE_LOGIN_KEY, "true");
      localStorage.setItem(LOCAL_STORAGE_GOOGLE_USER, String(isGoogleUser));
    }
    if (typeof window !== "undefined" && window.sessionStorage) {
      sessionStorage.removeItem(SESSION_STORAGE_SHARELINKS_KEY);
      sessionStorage.removeItem(SESSION_STORAGE_FETCH_STATUS_KEY);
    }

    setAuthState({
      token,
      username,
      isLoggedIn: true,
      isGoogleUser,
    });
  }, []);

  const logout = useCallback(async () => {
    try {
      // Notify backend to clear httpOnly cookie
      await apiClient(`${BACKEND_API_URL}/api/logout`, {
        method: "POST",
        credentials: "include",
        skipAuthRedirect: true,
      }).catch(() => {});
    } finally {
      clearStorageAuthState();
      setAuthState({
        token: null,
        username: "",
        isLoggedIn: false,
        isGoogleUser: false,
      });
    }
  }, []);

  const updateUsername = useCallback((newUsername) => {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem(LOCAL_STORAGE_USERNAME_KEY, newUsername);
    }
    setAuthState((prev) => ({
      ...prev,
      username: newUsername,
    }));
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient(`${BACKEND_API_URL}/api/protected`, {
        method: "GET",
        credentials: "include",
        skipAuthRedirect: true,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.username) {
          setAuthState((prev) => ({
            ...prev,
            username: data.username,
            isLoggedIn: true,
          }));
          return true;
        }
      } else if (response.status === 401 || response.status === 403) {
        logout();
        return false;
      }
    } catch {
      // Network error, keep existing optimistic state
    } finally {
      setLoading(false);
    }
    return false;
  }, [logout]);

  useEffect(() => {
    // Listen for cross-tab or in-app logout
    const handleLogoutEvent = () => {
      setAuthState({
        token: null,
        username: "",
        isLoggedIn: false,
        isGoogleUser: false,
      });
    };

    const handleStorageChange = (e) => {
      if (
        e.key === LOCAL_STORAGE_TOKEN_KEY ||
        e.key === LOCAL_STORAGE_LOGIN_KEY ||
        e.key === LOCAL_STORAGE_USERNAME_KEY
      ) {
        setAuthState(getInitialAuthState());
      }
    };

    window.addEventListener("auth:logout", handleLogoutEvent);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("auth:logout", handleLogoutEvent);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const value = {
    isLoggedIn: authState.isLoggedIn,
    isAuthenticated: authState.isLoggedIn,
    token: authState.token,
    username: authState.username,
    isGoogleUser: authState.isGoogleUser,
    loading,
    login,
    logout,
    updateUsername,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * useAuth Hook
 * Returns { isLoggedIn, isAuthenticated, token, username, isGoogleUser, login, logout, updateUsername, loading, checkAuth }
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context) {
    return context;
  }

  // Fallback for components rendered outside of AuthProvider (e.g. isolated unit tests)
  const initial = getInitialAuthState();
  return {
    isLoggedIn: initial.isLoggedIn,
    isAuthenticated: initial.isLoggedIn,
    token: initial.token,
    username: initial.username,
    isGoogleUser: initial.isGoogleUser,
    loading: false,
    login: (data) => {
      if (typeof window !== "undefined" && window.localStorage) {
        if (data?.token) localStorage.setItem(LOCAL_STORAGE_TOKEN_KEY, data.token);
        if (data?.username) localStorage.setItem(LOCAL_STORAGE_USERNAME_KEY, data.username);
        localStorage.setItem(LOCAL_STORAGE_LOGIN_KEY, "true");
        if (data?.isgoogleuser !== undefined) {
          localStorage.setItem(LOCAL_STORAGE_GOOGLE_USER, String(data.isgoogleuser));
        }
      }
    },
    logout: () => {
      clearStorageAuthState();
    },
    updateUsername: (newUsername) => {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem(LOCAL_STORAGE_USERNAME_KEY, newUsername);
      }
    },
    checkAuth: async () => initial.isLoggedIn,
  };
};

export default useAuth;
