import { useState, useRef, useCallback } from "react";
import Swal from "sweetalert2";
import { apiClient } from "../api/client";
import { GENAI_API_URL } from "../utils/constants";
import { useUsageCounts } from "./useUsageCounts";

const MAX_SIZE = 500 * 1024; // 500 KB limit

/**
 * Hook to execute code against backend compiler/LLM execution endpoint.
 * Supports streaming responses, AbortController cancellation,
 * AI-simulated detection, and backend error marker parsing.
 */
export const useRunCode = ({ defaultOutput = "", storageKey = null } = {}) => {
  const [output, setOutput] = useState(() => {
    if (storageKey) {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) return saved;
    }
    return defaultOutput;
  });
  const [isRunning, setIsRunning] = useState(false);
  const [isSimulated, setIsSimulated] = useState(false);
  const [error, setError] = useState(null);

  const abortControllerRef = useRef(null);
  const { incrementRunCount } = useUsageCounts();

  const clearOutput = useCallback(() => {
    setOutput("");
    setError(null);
    setIsSimulated(false);
    if (storageKey) {
      sessionStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  const cancelRun = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsRunning(false);
    setOutput((prev) => prev + (prev ? "\n\n" : "") + "[Execution cancelled by user]");
  }, []);

  const runCode = useCallback(
    async ({
      code = "",
      language = "",
      apiEndpoint = `${GENAI_API_URL}/get-output`,
      terminalRef = null,
      onChunk = null,
    }) => {
      const trimmedCode = code.trim();
      if (!trimmedCode) return;

      if (trimmedCode.length > MAX_SIZE) {
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

      // Abort any existing in-flight execution
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsRunning(true);
      setError(null);

      try {
        const response = await apiClient(apiEndpoint, {
          method: "POST",
          body: JSON.stringify({ language, code }),
          signal: controller.signal,
        });

        // Check if backend indicated execution is AI-simulated
        const simulatedHeader =
          response.headers.get("x-ai-simulated") === "true" ||
          response.headers.get("x-simulation") === "true";
        setIsSimulated(simulatedHeader);

        if (!response.ok || !response.body) {
          throw new Error(`Failed to run code (status ${response.status})`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let accumulatedOutput = "";
        let isFirstChunk = true;
        let streamErrorDetected = false;
        let streamErrorMessage = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          accumulatedOutput += chunk;

          if (isFirstChunk) {
            setOutput("");
            if (terminalRef?.current) {
              terminalRef.current.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
            }
            isFirstChunk = false;
          }

          // Check for backend stream error marker: \n[Generation Error: ...]
          const errorMatch = accumulatedOutput.match(/\[Generation Error:\s*(.*?)\]/);
          if (errorMatch) {
            streamErrorDetected = true;
            streamErrorMessage = errorMatch[1] || "Error occurred during execution stream.";
          }

          setOutput(accumulatedOutput);
          if (typeof onChunk === "function") {
            onChunk(chunk, accumulatedOutput);
          }

          if (terminalRef?.current) {
            setTimeout(() => {
              requestAnimationFrame(() => {
                if (terminalRef.current) {
                  terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
                }
              });
            }, 0);
          }
        }

        if (streamErrorDetected) {
          setError(streamErrorMessage);
          Swal.fire({
            icon: "error",
            title: "Execution Error",
            text: streamErrorMessage,
          });
        } else if (accumulatedOutput.length > 0) {
          const now = new Date();
          const timeString = now.toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
          });
          const dateString = now.toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "2-digit",
          });
          const completedMsg = `\n\n--- Completed @ ${timeString} on ${dateString} ---`;
          const finalOutput = accumulatedOutput + completedMsg;
          setOutput(finalOutput);
          if (storageKey) {
            sessionStorage.setItem(storageKey, finalOutput);
          }
          await incrementRunCount(language);
        }
      } catch (err) {
        if (err.name === "AbortError") {
          // Handled in cancelRun
          return;
        }
        const errMsg = err.message || "Failed!! Try again.";
        setError(errMsg);
        setOutput("Failed!! Try again.");
      } finally {
        setIsRunning(false);
        abortControllerRef.current = null;
        if (terminalRef?.current) {
          setTimeout(() => {
            requestAnimationFrame(() => {
              if (terminalRef.current) {
                terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
              }
            });
          }, 0);
        }
      }
    },
    [incrementRunCount, storageKey]
  );

  return {
    output,
    setOutput,
    isRunning,
    isSimulated,
    setIsSimulated,
    error,
    runCode,
    cancelRun,
    clearOutput,
  };
};

export default useRunCode;
