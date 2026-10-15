import { RECAPTCHA_SITE_KEY } from "./constants";
import { error as loggerError } from "./logger";

export const apiFetch = async (url, options = {}) => {
  const methodsWithBody = ["POST", "PUT", "DELETE"];
  const requestMethod = options.method?.toUpperCase();

  options.headers = {
    "Content-Type": "application/json",
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
