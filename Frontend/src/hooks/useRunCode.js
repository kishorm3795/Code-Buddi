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
  const [engine, setEngine] = useState("sandbox");
  const [metrics, setMetrics] = useState({
    executionTimeMs: null,
    memoryKb: null,
    exitCode: null,
    status: null,
  });
  const [quota, setQuota] = useState({
    dailyLimit: null,
    dailyRemaining: null,
    resetSeconds: null,
  });
  const [error, setError] = useState(null);

  const abortControllerRef = useRef(null);
  const { incrementRunCount } = useUsageCounts();

  const clearOutput = useCallback(() => {
    setOutput("");
    setError(null);
    setIsSimulated(false);
    setMetrics({
      executionTimeMs: null,
      memoryKb: null,
      exitCode: null,
      status: null,
    });
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
      stdin = "",
      apiEndpoint = `${GENAI_API_URL}/execute`,
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
          body: JSON.stringify({ language, code, stdin }),
          signal: controller.signal,
        });

        // Parse execution engine & quota headers
        const simulatedHeader =
          response.headers.get("x-ai-simulated") === "true" ||
          response.headers.get("x-simulation") === "true";
        setIsSimulated(simulatedHeader);

        const engineHeader = response.headers.get("x-execution-engine") || (simulatedHeader ? "gemini-ai" : "sandbox");
        setEngine(engineHeader);

        const limitHdr = response.headers.get("x-quota-limit");
        const remHdr = response.headers.get("x-quota-remaining");
        const resetHdr = response.headers.get("x-quota-reset");
        if (limitHdr && remHdr) {
          setQuota({
            dailyLimit: parseInt(limitHdr, 10),
            dailyRemaining: parseInt(remHdr, 10),
            resetSeconds: resetHdr ? parseInt(resetHdr, 10) : null,
          });
        }

        // Handle Quota Limit / Rate Throttling specifically
        if (response.status === 429) {
          const errData = await response.json().catch(() => ({}));
          const errMsg = errData.error?.message || "Execution limit reached. Please wait before running again.";
          setError(errMsg);
          setOutput(`[Quota Notice: ${errMsg}]`);
          Swal.fire({
            icon: "warning",
            title: "Execution Limit Reached",
            text: errMsg,
            confirmButtonText: "OK",
          });
          return;
        }

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          const errMsg = errData.error?.message || `Execution failed (status ${response.status})`;
          throw new Error(errMsg);
        }

        const contentType = response.headers.get("content-type") || "";

        // Path A: JSON response from /execute
        if (contentType.includes("application/json")) {
          const data = await response.json();
          const runInfo = data.run || {};
          const stdout = runInfo.stdout || "";
          const stderr = runInfo.stderr || "";
          const executionOutput = runInfo.output || (stdout + (stderr ? `\n${stderr}` : ""));

          setMetrics({
            executionTimeMs: runInfo.execution_time_ms || null,
            memoryKb: runInfo.memory_kb || null,
            exitCode: runInfo.exit_code,
            status: data.status,
          });

          if (data.quota) {
            setQuota({
              dailyLimit: data.quota.daily_limit,
              dailyRemaining: data.quota.daily_remaining,
              resetSeconds: data.quota.reset_seconds,
            });
          }

          const now = new Date();
          const timeString = now.toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
          });
          const execTimeMs = runInfo.execution_time_ms ? ` in ${runInfo.execution_time_ms}ms` : "";
          const exitMsg = runInfo.exit_code === 0
            ? `\n\n--- Process finished with exit code 0${execTimeMs} @ ${timeString} ---`
            : `\n\n--- Process finished with exit code ${runInfo.exit_code}${execTimeMs} @ ${timeString} ---`;

          const finalOutput = (executionOutput || "[No output produced]") + exitMsg;
          setOutput(finalOutput);

          if (storageKey) {
            sessionStorage.setItem(storageKey, finalOutput);
          }

          if (runInfo.exit_code !== 0 && stderr) {
            setError(`Process exited with code ${runInfo.exit_code}`);
          }

          await incrementRunCount(language);
          return;
        }

        // Path B: Streaming text fallback (legacy /get-output)
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

          const errorMatch = accumulatedOutput.match(/\[Generation Error:\s*(.*?)\]/);
          if (errorMatch) {
            streamErrorDetected = true;
            streamErrorMessage = errorMatch[1] || "Error occurred during execution stream.";
          }

          setOutput(accumulatedOutput);
          if (typeof onChunk === "function") {
            onChunk(chunk, accumulatedOutput);
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
          const completedMsg = `\n\n--- Completed @ ${timeString} ---`;
          const finalOutput = accumulatedOutput + completedMsg;
          setOutput(finalOutput);
          if (storageKey) {
            sessionStorage.setItem(storageKey, finalOutput);
          }
          await incrementRunCount(language);
        }
      } catch (err) {
        if (err.name === "AbortError") {
          return;
        }
        const errMsg = err.message || "Failed!! Try again.";
        setError(errMsg);
        setOutput(`Execution failed: ${errMsg}`);
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
    engine,
    metrics,
    quota,
    error,
    runCode,
    cancelRun,
    clearOutput,
  };
};

export default useRunCode;
