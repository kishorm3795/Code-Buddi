import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { apiClient } from "../api/client";
import { GENAI_API_URL } from "../utils/constants";
import { useAuth } from "./useAuth";
import { useUsageCounts } from "./useUsageCounts";

/**
 * Prompt prompt-input dialog with optional Gemini prompt improvement.
 */
export const promptForDescription = async (language, navigate, isLoggedIn) => {
  if (!isLoggedIn) {
    navigate("/login");
    return null;
  }

  const { value: result } = await Swal.fire({
    title: "Generate Code",
    html: `
      <textarea id="swal-input1" class="swal2-textarea !w-[82%]" placeholder="e.g., simple calculator"></textarea>
      <label class="flex justify-center mt-3">
        <input type="checkbox" id="improvePrompt" class="mr-2"> Improve Prompt
      </label>
    `,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: "Generate",
    preConfirm: () => {
      const prompt = document.getElementById("swal-input1")?.value?.trim();
      const improve = document.getElementById("improvePrompt")?.checked;
      if (!prompt) {
        Swal.showValidationMessage("This field is mandatory! Please enter a prompt.");
        return null;
      }
      return { prompt, improve };
    },
    didOpen: () => {
      const modal = Swal.getPopup();
      const checkbox = modal?.querySelector("#improvePrompt");
      const confirmBtn = modal?.querySelector(".swal2-confirm");

      checkbox?.addEventListener("change", () => {
        if (confirmBtn) {
          confirmBtn.textContent = checkbox.checked ? "Improve" : "Generate";
        }
      });

      modal?.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && e.ctrlKey) {
          e.preventDefault();
          Swal.clickConfirm();
        }
      });
    },
    allowOutsideClick: false,
  });

  if (!result) return null;

  let finalPrompt = result.prompt;

  if (result.improve) {
    Swal.fire({
      title: "Improving Prompt...",
      html: "Please wait while we generate new ideas.",
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    try {
      const response = await apiClient(`${GENAI_API_URL}/improve-prompt`, {
        method: "POST",
        body: JSON.stringify({
          topic: finalPrompt,
          language: language === "htmlcssjs" ? "htmlcssjs" : language,
        }),
      });

      const json = await response.json();

      if (!json.prompts || Object.keys(json.prompts).length === 0) {
        await Swal.fire("Error", "Failed to generate improved prompts.", "error");
        return null;
      }

      const prompts = Object.values(json.prompts);

      const selectedPrompt = await new Promise((resolve) => {
        const promptsHtml = prompts
          .map(
            (p, index) => `
          <div class="flex items-center justify-between border border-gray-200 p-[10px] rounded-md mb-[10px]">
            <p class="flex-grow select-text text-left m-0">${p}</p>
            <button class="swal2-confirm swal2-styled select-prompt-btn ml-[15px] py-[10px] px-[12px]" data-index="${index}" title="Select this prompt">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </button>
          </div>`
          )
          .join("");

        Swal.fire({
          title: "Select an Improved Prompt",
          html: `<div>${promptsHtml}</div>`,
          showConfirmButton: false,
          showCancelButton: true,
          allowOutsideClick: false,
          cancelButtonText: "Cancel",
          didOpen: () => {
            const promptButtons = document.querySelectorAll(".select-prompt-btn");
            promptButtons.forEach((button) => {
              button.addEventListener("click", () => {
                const index = button.getAttribute("data-index");
                if (index !== null) {
                  resolve(prompts[parseInt(index, 10)]);
                  Swal.close();
                }
              });
            });
          },
        }).then((res) => {
          if (res.dismiss) resolve(null);
        });
      });

      if (!selectedPrompt) return null;
      finalPrompt = selectedPrompt;
    } catch {
      await Swal.fire("Error", "Failed to improve prompt.", "error");
      return null;
    }
  }

  return finalPrompt;
};

/**
 * Hook to handle streaming code generation, prompt improvement,
 * AbortController cancellation, and error marker checks.
 */
export const useGenerate = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingAction, setLoadingAction] = useState(null); // 'thinking' | 'generate' | null
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  const navigate = useNavigate();
  const { isLoggedIn, token } = useAuth();
  const { incrementGenerateCount } = useUsageCounts();

  const cancelGenerate = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
    setLoadingAction(null);
  }, []);

  /**
   * Single language generator (used by CodeEditor)
   */
  const generateCode = useCallback(
    async ({ language, setCode, editorRef, onStart, onComplete }) => {
      const finalPrompt = await promptForDescription(language, navigate, isLoggedIn);
      if (!finalPrompt) return;

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsGenerating(true);
      setLoadingAction("thinking");
      setError(null);
      if (typeof onStart === "function") onStart();

      try {
        if (!token && !isLoggedIn) throw new Error("Authentication token missing.");

        const response = await apiClient(`${GENAI_API_URL}/generate_code`, {
          method: "POST",
          body: JSON.stringify({
            problem_description: finalPrompt,
            language,
          }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error("Failed to generate code.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let generatedCode = "";
        let isFirstChunk = true;
        let streamErrorDetected = false;
        let streamErrorMessage = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          if (isFirstChunk) {
            setLoadingAction("generate");
            setCode("");
            isFirstChunk = false;
          }

          const chunk = decoder.decode(value, { stream: true });
          generatedCode += chunk;

          // Check for stream error marker
          const errorMatch = generatedCode.match(/\[Generation Error:\s*(.*?)\]/);
          if (errorMatch) {
            streamErrorDetected = true;
            streamErrorMessage = errorMatch[1] || "Error during code generation.";
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
            title: "Generation Error",
            text: streamErrorMessage,
          });
          setCode("");
        } else if (!generatedCode.trim()) {
          Swal.fire({
            icon: "warning",
            text: "No code was generated. Please try again.",
            timer: 5000,
          });
        } else {
          if (isLoggedIn) {
            await incrementGenerateCount();
          }
        }
      } catch (err) {
        if (err.name === "AbortError") return;
        setError(err.message || "Failed to generate code.");
        Swal.fire("Error", "Failed to generate code.", "error");
      } finally {
        setIsGenerating(false);
        setLoadingAction(null);
        abortControllerRef.current = null;
        if (typeof onComplete === "function") onComplete();
      }
    },
    [navigate, isLoggedIn, token, incrementGenerateCount]
  );

  /**
   * Multi-stream generator for HTML, CSS, JS (used by Editor)
   */
  const generateHtmlCssJs = useCallback(
    async ({
      setCode,
      setOverlayText,
      setIsPreviewEnabled,
      languages = ["html", "css", "javascript"],
      scrollToLastLine,
      onStart,
      onComplete,
    }) => {
      const finalPrompt = await promptForDescription("htmlcssjs", navigate, isLoggedIn);
      if (!finalPrompt) return;

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsGenerating(true);
      setLoadingAction("generate");
      setError(null);
      if (typeof onStart === "function") onStart();

      const streamSinglePart = async (type, payload) => {
        const response = await apiClient(`${GENAI_API_URL}/htmlcssjsgenerate-code`, {
          method: "POST",
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error(`Failed to generate ${type.toUpperCase()}.`);
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
            throw new Error(errorMatch[1] || `Generation error in ${type}`);
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
        setOverlayText?.("Generating HTML...");
        const htmlCode = await streamSinglePart("html", {
          prompt: finalPrompt,
          type: "html",
        });

        setOverlayText?.("Generating CSS...");
        const cssCode = await streamSinglePart("css", {
          prompt: finalPrompt,
          htmlContent: htmlCode,
          type: "css",
        });

        setOverlayText?.("Generating JS...");
        await streamSinglePart("js", {
          prompt: finalPrompt,
          htmlContent: htmlCode,
          cssContent: cssCode,
          type: "js",
        });

        if (isLoggedIn) {
          await incrementGenerateCount();
        }
      } catch (err) {
        if (err.name === "AbortError") return;
        setError(err.message || "Failed to generate code.");
        Swal.fire("Error", err.message || "Failed to generate code.", "error");
      } finally {
        setIsGenerating(false);
        setLoadingAction(null);
        abortControllerRef.current = null;
        if (typeof onComplete === "function") onComplete();
      }
    },
    [navigate, isLoggedIn, incrementGenerateCount]
  );

  return {
    generateCode,
    generateHtmlCssJs,
    cancelGenerate,
    isGenerating,
    loadingAction,
    error,
  };
};

export default useGenerate;
