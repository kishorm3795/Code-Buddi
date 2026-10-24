import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { apiClient } from "../api/client";
import { GENAI_API_URL } from "../utils/constants";
import { useAuth } from "./useAuth";
import { useUsageCounts } from "./useUsageCounts";

const MAX_SIZE = 500 * 1024; // 500 KB

export const promptForRefactorSuggestions = async () => {
  const { value: prompt, isConfirmed } = await Swal.fire({
    title: "Refactor Code",
    input: "textarea",
    inputLabel: "Suggestions to improve the code (optional)",
    inputPlaceholder: "e.g., remove comments, optimize loop, etc.",
    confirmButtonText: "Refactor",
    showCancelButton: true,
    allowOutsideClick: false,
    footer:
      '<p class="text-center text-sm text-red-500 dark:text-red-300">Suggestions help improve results, <span class="font-bold">but are optional</span>.</p>',
    didOpen: () => {
      const modal = Swal.getPopup();
      modal?.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && e.ctrlKey) {
          e.preventDefault();
          Swal.clickConfirm();
        }
      });
    },
  });

  if (!isConfirmed) return null;
  return prompt?.trim() || null;
};

/**
 * Hook to handle streaming code refactoring,
 * AbortController cancellation, and backend error marker checks.
 */
export const useRefactor = () => {
  const [isRefactoring, setIsRefactoring] = useState(false);
  const [loadingAction, setLoadingAction] = useState(null); // 'thinking' | 'refactor' | null
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  const navigate = useNavigate();
  const { isLoggedIn, token } = useAuth();
  const { incrementRefactorCount } = useUsageCounts();

  const cancelRefactor = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsRefactoring(false);
    setLoadingAction(null);
  }, []);

  /**
   * Refactor single language code (used by CodeEditor)
   */
  const refactorCode = useCallback(
    async ({
      code = "",
      language = "",
      output = "",
      setCode,
      editorRef,
      onStart,
      onComplete,
    }) => {
      if (!isLoggedIn) {
        navigate("/login");
        return;
      }

      if (!code.trim() || !language) return;

      if (code.trim().length > MAX_SIZE) {
        Swal.fire({
          title: "Error",
          text: `The ${
            language.charAt(0).toUpperCase() + language.slice(1)
          } code exceeds the maximum allowed size of 500 KB.`,
          icon: "error",
          confirmButtonText: "OK",
        });
        return;
      }

      const suggestion = await promptForRefactorSuggestions();
      if (suggestion === null) return;

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsRefactoring(true);
      setLoadingAction("thinking");
      setError(null);
      if (typeof onStart === "function") onStart();

      try {
        if (!token && !isLoggedIn) throw new Error("Authentication token missing.");

        const response = await apiClient(`${GENAI_API_URL}/refactor_code`, {
          method: "POST",
          body: JSON.stringify({
            problem_description: suggestion,
            language,
            code,
            output,
          }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error("Failed to refactor code.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let refactoredCode = "";
        let isFirstChunk = true;
        let streamErrorDetected = false;
        let streamErrorMessage = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          if (isFirstChunk) {
            setCode("");
            setLoadingAction("refactor");
            isFirstChunk = false;
          }

          const chunk = decoder.decode(value, { stream: true });
          refactoredCode += chunk;

          const errorMatch = refactoredCode.match(/\[Generation Error:\s*(.*?)\]/);
          if (errorMatch) {
            streamErrorDetected = true;
            streamErrorMessage = errorMatch[1] || "Error during refactoring stream.";
            break;
          }

          setCode((prev) => {
            const updated = prev + chunk;
            setTimeout(() => {
              const editor = editorRef?.current;
              const model = editor?.getModel?.();
              const lineCount = model?.getLineCount?.();
              if (lineCount) {
                editor.revealLineInCenter(lineCount);
              }
            }, 0);
            return updated;
          });
        }

        if (streamErrorDetected) {
          setError(streamErrorMessage);
          Swal.fire({
            icon: "error",
            title: "Refactor Error",
            text: streamErrorMessage,
          });
        } else if (!refactoredCode.trim()) {
          Swal.fire({
            icon: "warning",
            text: "No code was refactored. Please try again.",
            timer: 5000,
          });
        } else {
          if (isLoggedIn) {
            await incrementRefactorCount();
          }
        }
      } catch (err) {
        if (err.name === "AbortError") return;
        setError(err.message || "Failed to refactor code.");
        Swal.fire("Error", "Failed to refactor code.", "error");
      } finally {
        setIsRefactoring(false);
        setLoadingAction(null);
        abortControllerRef.current = null;
        if (typeof onComplete === "function") onComplete();
      }
    },
    [navigate, isLoggedIn, token, incrementRefactorCount]
  );

  /**
   * Refactor HTML, CSS, JS code (used by Editor)
   */
  const refactorHtmlCssJs = useCallback(
    async ({
      code,
      setCode,
      setOverlayText,
      setIsPreviewEnabled,
      languages = ["html", "css", "javascript"],
      scrollToLastLine,
      onStart,
      onComplete,
    }) => {
      if (!isLoggedIn) {
        navigate("/login");
        return;
      }

      const hasCode =
        code.html.trim().length > 0 ||
        code.css.trim().length > 0 ||
        code.javascript.trim().length > 0;
      if (!hasCode) return;

      const suggestion = await promptForRefactorSuggestions();
      if (suggestion === null) return;

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsRefactoring(true);
      setLoadingAction("refactor");
      setError(null);
      if (typeof onStart === "function") onStart();

      const streamSinglePart = async (type, currentCodeObj) => {
        const response = await apiClient(`${GENAI_API_URL}/htmlcssjsrefactor-code`, {
          method: "POST",
          body: JSON.stringify({
            type,
            html: currentCodeObj.html,
            css: currentCodeObj.css,
            javascript: currentCodeObj.javascript,
            suggestions: suggestion,
          }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error(`Failed to refactor ${type.toUpperCase()}.`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let result = "";
        let isFirstChunk = true;

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          result += chunk;

          const errorMatch = result.match(/\[Generation Error:\s*(.*?)\]/);
          if (errorMatch) {
            throw new Error(errorMatch[1] || `Refactoring error in ${type}`);
          }

          if (isFirstChunk) {
            setIsPreviewEnabled(false);
            setCode((prev) => ({ ...prev, [type === "js" ? "javascript" : type]: "" }));
            isFirstChunk = false;
          }

          setCode((prev) => ({
            ...prev,
            [type === "js" ? "javascript" : type]:
              (prev[type === "js" ? "javascript" : type] || "") + chunk,
          }));

          if (typeof scrollToLastLine === "function") {
            const langKey = type === "html" ? languages[0] : type === "css" ? languages[1] : languages[2];
            scrollToLastLine(langKey);
          }
        }

        setIsPreviewEnabled(true);
        return result;
      };

      try {
        setOverlayText?.("Refactoring HTML...");
        const resultHtml = await streamSinglePart("html", code);

        setOverlayText?.("Refactoring CSS...");
        const resultCss = await streamSinglePart("css", {
          ...code,
          html: resultHtml,
        });

        setOverlayText?.("Refactoring JS...");
        await streamSinglePart("js", {
          html: resultHtml,
          css: resultCss,
          javascript: code.javascript,
        });

        if (isLoggedIn) {
          await incrementRefactorCount();
        }
      } catch (err) {
        if (err.name === "AbortError") return;
        setError(err.message || "Failed to refactor code.");
        Swal.fire("Error", err.message || "Failed to refactor code.", "error");
      } finally {
        setIsRefactoring(false);
        setLoadingAction(null);
        abortControllerRef.current = null;
        if (typeof onComplete === "function") onComplete();
      }
    },
    [navigate, isLoggedIn, incrementRefactorCount]
  );

  return {
    refactorCode,
    refactorHtmlCssJs,
    cancelRefactor,
    isRefactoring,
    loadingAction,
    error,
  };
};

export default useRefactor;
