import { RECAPTCHA_SITE_KEY, LOCAL_STORAGE_TOKEN_KEY } from "./constants.js";
import { error as loggerError } from "./logger";

export const apiFetch = async (url, options = {}) => {
  const methodsWithBody = ["POST", "PUT", "DELETE"];
  const requestMethod = options.method?.toUpperCase();

  // Ensure cookies (JWT httpOnly) are transmitted to same-origin reverse proxy
  options.credentials = options.credentials || "include";

  // Provide Authorization header fallback from local storage if present
  let authHeader = {};
  try {
    const token = typeof window !== "undefined" && window.localStorage ? localStorage.getItem(LOCAL_STORAGE_TOKEN_KEY) : null;
    if (token) {
      authHeader = { Authorization: `Bearer ${token}` };
    }
  } catch (e) {
    // Ignore storage access errors
  }

  options.headers = {
    "Content-Type": "application/json",
    ...authHeader,
    ...options.headers,
  };

  if (RECAPTCHA_SITE_KEY && methodsWithBody.includes(requestMethod)) {
    if (window.grecaptcha) {
      try {
        const token = await new Promise((resolve) => {
          window.grecaptcha.ready(() => {
            window.grecaptcha
              .execute(RECAPTCHA_SITE_KEY, { action: "submit" })
              .then(resolve);
          });
        });

        options.headers["X-Recaptcha-Token"] = token;
      } catch (error) {
        loggerError("Could not get reCAPTCHA token", { error: error.message });
        return Promise.reject(error);
      }
    }
  }

  return fetch(url, options);
};
