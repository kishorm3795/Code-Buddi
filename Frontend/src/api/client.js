import {
  RECAPTCHA_SITE_KEY,
  LOCAL_STORAGE_TOKEN_KEY,
  LOCAL_STORAGE_USERNAME_KEY,
  LOCAL_STORAGE_LOGIN_KEY,
  LOCAL_STORAGE_GOOGLE_USER,
  SESSION_STORAGE_SHARELINKS_KEY,
  SESSION_STORAGE_FETCH_STATUS_KEY,
  VALIDATION_MESSAGES,
} from "../utils/constants";
import { error as loggerError } from "../utils/logger";

/**
 * Clear all authentication-related storage and trigger auth events.
 */
export const clearAuthState = () => {
  try {
    if (typeof window !== "undefined") {
      if (window.localStorage) {
        localStorage.removeItem(LOCAL_STORAGE_TOKEN_KEY);
        localStorage.removeItem(LOCAL_STORAGE_USERNAME_KEY);
        localStorage.removeItem(LOCAL_STORAGE_LOGIN_KEY);
        localStorage.removeItem(LOCAL_STORAGE_GOOGLE_USER);
      }
      if (window.sessionStorage) {
        sessionStorage.removeItem(SESSION_STORAGE_SHARELINKS_KEY);
        sessionStorage.removeItem(SESSION_STORAGE_FETCH_STATUS_KEY);
      }
      window.dispatchEvent(new CustomEvent("auth:logout"));
    }
  } catch (err) {
    loggerError("Error clearing auth state", { error: err.message });
  }
};

/**
 * Custom Error class representing API errors with parsed status and data.
 */
export class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

/**
 * Helper to consistently parse error messages from responses or exceptions.
 */
export const parseApiError = async (response) => {
  if (!response) return "An unexpected error occurred.";
  if (response.errorMessage) return response.errorMessage;

  try {
    const clone = response.clone ? response.clone() : response;
    const data = typeof clone.json === "function" ? await clone.json() : clone;
    if (response.status === 429) {
      return data?.msg || data?.message || VALIDATION_MESSAGES.RATE_LIMITED;
    }
    return (
      data?.msg ||
      data?.message ||
      data?.error ||
      response.statusText ||
      "Request failed."
    );
  } catch {
    return response.statusText || "Request failed.";
  }
};

/**
 * Fetch a reCAPTCHA v3 token for non-GET requests if available.
 */
const getRecaptchaToken = async (action = "submit") => {
  if (typeof window === "undefined" || !window.grecaptcha) {
    return null;
  }
  const siteKey = RECAPTCHA_SITE_KEY || "recaptcha-key";

  return new Promise((resolve) => {
    try {
      window.grecaptcha.ready(async () => {
        try {
          const token = await window.grecaptcha.execute(siteKey, {
            action,
          });
          resolve(token);
        } catch (err) {
          loggerError("Could not get reCAPTCHA token", { error: err.message });
          resolve(null);
        }
      });
    } catch {
      resolve(null);
    }
  });
};

/**
 * Checks if the request URL is an unauthenticated entry point (login, register, etc.)
 * where 401/403 should be returned to caller for form error display rather than
 * kicking off a redirect loop to /login.
 */
const isAuthEndpoint = (url) => {
  if (typeof url !== "string") return false;
  const authRoutes = [
    "/api/login",
    "/api/auth/google",
    "/api/register",
    "/api/verify-otp",
    "/api/resend-otp",
    "/api/check-email-exists",
    "/api/forgot-password",
    "/api/reset-password",
    "/api/update-password",
    "/api/wrong-email",
  ];
  return authRoutes.some((route) => url.includes(route));
};

/**
 * Unified API Client Fetch Wrapper
 *
 * - Attaches reCAPTCHA token to all non-GET requests (POST, PUT, DELETE, PATCH).
 * - Attaches Authorization header (Bearer token) if token exists in storage.
 * - Always sends credentials: 'include' for httpOnly cookie authentication.
 * - Handles 401/403 by logging out and redirecting to /login (unless on auth endpoint or skipAuthRedirect).
 * - Consistently parses JSON errors into response.errorData and response.errorMessage.
 */
export const apiClient = async (url, options = {}) => {
  const mergedOptions = { ...options };
  const method = (mergedOptions.method || "GET").toUpperCase();
  const isNonGet = method !== "GET" && method !== "HEAD";

  // 1. Credentials include for httpOnly cookies
  mergedOptions.credentials = mergedOptions.credentials || "include";

  // 2. Prepare headers
  const headers = { ...mergedOptions.headers };

  // Attach default Content-Type if body exists and not FormData
  if (
    mergedOptions.body &&
    !(mergedOptions.body instanceof FormData) &&
    !headers["Content-Type"] &&
    !headers["content-type"]
  ) {
    headers["Content-Type"] = "application/json";
  }

  // Attach Authorization header fallback if token present and not already provided
  if (!headers.Authorization && !headers.authorization) {
    try {
      const token =
        typeof window !== "undefined" && window.localStorage
          ? localStorage.getItem(LOCAL_STORAGE_TOKEN_KEY)
          : null;
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // Storage access error, continue
    }
  }

  // 3. Attach reCAPTCHA token for non-GET requests
  if (isNonGet && !headers["X-Recaptcha-Token"] && !headers["x-recaptcha-token"]) {
    try {
      const recaptchaToken = await getRecaptchaToken(
        mergedOptions.recaptchaAction || "submit"
      );
      if (recaptchaToken) {
        headers["X-Recaptcha-Token"] = recaptchaToken;
      }
    } catch (err) {
      loggerError("reCAPTCHA execution failed", { error: err.message });
    }
  }

  mergedOptions.headers = headers;

  // 4. Perform actual fetch
  const response = await fetch(url, mergedOptions);

  // 5. Consistently parse JSON errors and handle 401/403 logout
  if (!response.ok) {
    let errorData = null;
    try {
      const clone = response.clone();
      errorData = await clone.json();
    } catch {
      try {
        const textClone = response.clone();
        const text = await textClone.text();
        errorData = text ? { msg: text } : null;
      } catch {
        errorData = null;
      }
    }

    response.errorData = errorData;

    let friendlyMessage = "";
    if (response.status === 429) {
      friendlyMessage =
        errorData?.msg ||
        errorData?.message ||
        VALIDATION_MESSAGES.RATE_LIMITED;
    } else {
      friendlyMessage =
        errorData?.msg ||
        errorData?.message ||
        errorData?.error ||
        response.statusText ||
        "Request failed";
    }
    response.errorMessage = friendlyMessage;

    // Handle 401/403 logout and redirect
    if (
      (response.status === 401 || response.status === 403) &&
      !mergedOptions.skipAuthRedirect &&
      !isAuthEndpoint(url)
    ) {
      clearAuthState();
      if (
        typeof window !== "undefined" &&
        window.location &&
        window.location.pathname !== "/login"
      ) {
        window.location.href = "/login";
      }
    }
  }

  return response;
};

// Backwards-compatible alias for apiFetch
export const apiFetch = apiClient;

export default apiClient;
