import { useCallback } from "react";
import { apiClient } from "../api/client";
import { BACKEND_API_URL } from "../utils/constants";
import { useAuth } from "./useAuth";

/**
 * Hook to manage usage metrics for code execution, generation, refactoring, and sharing.
 */
export const useUsageCounts = () => {
  const { isLoggedIn, token } = useAuth();

  const incrementRunCount = useCallback(
    async (language) => {
      if (!isLoggedIn && !token) return;
      try {
        await apiClient(`${BACKEND_API_URL}/api/runCode/count`, {
          method: "POST",
          body: JSON.stringify({ language }),
        });
      } catch (err) {
        console.warn("Failed to increment run code count:", err);
      }
    },
    [isLoggedIn, token]
  );

  const incrementGenerateCount = useCallback(async () => {
    if (!isLoggedIn && !token) return;
    try {
      await apiClient(`${BACKEND_API_URL}/api/generateCode/count`, {
        method: "POST",
      });
    } catch (err) {
      console.warn("Failed to increment generate code count:", err);
    }
  }, [isLoggedIn, token]);

  const incrementRefactorCount = useCallback(async () => {
    if (!isLoggedIn && !token) return;
    try {
      await apiClient(`${BACKEND_API_URL}/api/refactorCode/count`, {
        method: "POST",
      });
    } catch (err) {
      console.warn("Failed to increment refactor code count:", err);
    }
  }, [isLoggedIn, token]);

  const saveSharedLinkCount = useCallback(
    async (shareId, title, expiryTime) => {
      if (!isLoggedIn && !token) return false;
      try {
        const response = await apiClient(
          `${BACKEND_API_URL}/api/sharedLink/count`,
          {
            method: "POST",
            body: JSON.stringify({ shareId, title, expiryTime }),
          }
        );
        return response.ok;
      } catch (err) {
        console.warn("Failed to save shared link count:", err);
        return false;
      }
    },
    [isLoggedIn, token]
  );

  return {
    incrementRunCount,
    incrementGenerateCount,
    incrementRefactorCount,
    saveSharedLinkCount,
  };
};

export default useUsageCounts;
