import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { apiClient } from "../api/client";
import { TEMP_SHARE_API_URL, SESSION_STORAGE_SHARELINKS_KEY } from "../utils/constants";
import ShareLinkModal from "../utils/ShareLinkModal";
import { useAuth } from "./useAuth";
import { useUsageCounts } from "./useUsageCounts";

const MAX_SIZE = 500 * 1024; // 500 KB

/**
 * Hook to manage generating and sharing code links.
 */
export const useShare = () => {
  const [isSharing, setIsSharing] = useState(false);
  const [shareError, setShareError] = useState(null);
  const navigate = useNavigate();
  const { isLoggedIn, token } = useAuth();
  const { saveSharedLinkCount } = useUsageCounts();

  const shareCode = useCallback(
    async ({
      code,
      language,
      defaultTitlePrefix = "",
      storageKeysToClear = [],
    }) => {
      if (!isLoggedIn && !token) {
        navigate("/login");
        return null;
      }

      // Check for code existence
      const isHtmlCssJs = language === "htmlcssjs";
      const codeString = isHtmlCssJs
        ? typeof code === "object"
          ? JSON.stringify(code)
          : String(code || "")
        : String(code || "");

      if (!codeString || codeString.trim().length === 0) {
        Swal.fire({
          icon: "error",
          title: "Missing Information",
          text: "Please provide both code and language before uploading.",
        });
        return null;
      }

      if (codeString.trim().length > MAX_SIZE) {
        Swal.fire({
          title: "Error",
          text: `The code exceeds the maximum allowed size of 500 KB.`,
          icon: "error",
          confirmButtonText: "OK",
        });
        return null;
      }

      const randomSuffix = Math.random().toString(36).substring(2, 7);
      const prefix = defaultTitlePrefix || language || "code";
      const defaultTitle = `${prefix}-untitled-${randomSuffix}`;
      const capitalizedTitle =
        defaultTitle.charAt(0).toUpperCase() + defaultTitle.slice(1);

      const { isDismissed } = await Swal.fire({
        title: "Create Share link",
        html: ShareLinkModal(capitalizedTitle),
        showCancelButton: true,
        allowOutsideClick: false,
        footer: `<p class="text-center text-sm text-red-500 dark:text-red-300">You can delete shared links at any time from <span class="font-bold">Homepage</span>.</p>`,
        didOpen: () => {
          const modal = Swal.getPopup();
          modal?.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              Swal.clickConfirm();
            }
          });
        },
      });

      if (isDismissed) {
        return null;
      }

      const titleInput = document.getElementById("titleInput");
      const titleValue = titleInput?.value?.trim() || "";
      const expiryRadio = document.querySelector('input[name="expiryTime"]:checked');
      const expiryTime = parseInt(expiryRadio?.value, 10) || 10;

      const finalTitle =
        titleValue.slice(0, 60) || capitalizedTitle;

      setIsSharing(true);
      setShareError(null);

      Swal.fire({
        title: "Generating...",
        text: "Please wait while your share link is being generated.",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      try {
        const payload = JSON.stringify({
          language,
          code: isHtmlCssJs && typeof code === "object" ? code : codeString,
          title: finalTitle,
          expiryTime,
        });

        const response = await apiClient(
          `${TEMP_SHARE_API_URL}/temp-file-upload`,
          {
            method: "POST",
            body: payload,
          }
        );

        if (!response.ok) {
          throw new Error("Failed to upload the code");
        }

        const data = await response.json();

        if (data?.fileUrl) {
          const url = new URL(data.fileUrl);
          const shareId = url.pathname.split("/").pop();
          const shareableLink = `${window.location.origin}/${shareId}`;

          if (isLoggedIn) {
            try {
              await saveSharedLinkCount(shareId, finalTitle, expiryTime);
            } catch (countErr) {
              console.warn("Could not record shared link count:", countErr);
            }
          }

          Swal.close();

          // Clear stored drafts for previous code
          storageKeysToClear.forEach((key) => {
            if (key) sessionStorage.removeItem(key);
          });
          sessionStorage.removeItem(SESSION_STORAGE_SHARELINKS_KEY);

          navigate(`/${shareId}`);

          Swal.fire({
            icon: "success",
            title: "Share Link is generated",
            html: `<p class="mb-2">Your code is accessible at:</p><pre class="bg-gray-100 dark:bg-neutral-800 text-neutral-800 dark:text-white p-2 rounded text-sm overflow-x-auto select-text whitespace-pre-wrap break-words">${shareableLink}</pre>`,
            confirmButtonText: "Copy",
            showCancelButton: true,
            cancelButtonText: "Close",
            allowOutsideClick: false,
            footer: `<p class="text-center text-sm text-red-500 dark:text-red-300">You can delete shared links at any time from <span class="font-bold">Homepage</span>.</p>`,
          }).then(async (result) => {
            if (result.isConfirmed) {
              try {
                await navigator.clipboard.writeText(shareableLink);
                Swal.fire({
                  title: "URL Copied!",
                  icon: "success",
                  timer: 2000,
                });
              } catch {
                Swal.fire({
                  title: "Failed to copy",
                  text: "Could not copy the URL to clipboard.",
                  icon: "error",
                });
              }
            }
          });

          return { shareId, shareableLink };
        } else {
          throw new Error("Response did not contain fileUrl");
        }
      } catch (err) {
        Swal.close();
        setShareError(err.message);
        Swal.fire({
          icon: "error",
          title: "Failed!!",
          text: "Please try again.",
          timer: 5000,
        });
        return null;
      } finally {
        setIsSharing(false);
      }
    },
    [isLoggedIn, token, navigate, saveSharedLinkCount]
  );

  return {
    shareCode,
    isSharing,
    shareError,
  };
};

export default useShare;
