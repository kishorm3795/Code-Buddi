import React, { useState } from "react";
import { BiTerminal } from "react-icons/bi";
import { FaCopy, FaTrashAlt, FaSpinner, FaStop } from "react-icons/fa";
import { MdDone } from "react-icons/md";

/**
 * OutputPanel displays execution results, AI-simulation badge,
 * streaming status, error alerts, and copy/clear controls.
 */
export const OutputPanel = ({
  output = "",
  isRunning = false,
  isSimulated = false,
  error = null,
  onClear = null,
  onCancel = null,
  terminalRef = null,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn("Could not copy output:", err);
    }
  };

  return (
    <div className="mt-6 hacker-glass rounded-xl overflow-hidden border border-gray-200 dark:border-green-500/20 shadow-xl">
      {/* Panel Header */}
      <div className="bg-gray-100/50 dark:bg-gray-800/50 p-3 border-b border-gray-200 dark:border-green-500/10 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <BiTerminal className="ml-2 text-xl text-green-400" />
          <h2 className="text-lg font-bold text-gray-700 dark:text-green-400 tracking-wide">
            Output
          </h2>
          {isSimulated && (
            <span
              data-testid="ai-simulated-badge"
              className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
            >
              AI-Simulated (Gemini)
            </span>
          )}
          {isRunning && (
            <span className="flex items-center text-xs text-blue-500 font-medium px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20">
              <FaSpinner className="animate-spin mr-1" />
              Running...
            </span>
          )}
        </div>

        {/* Panel Controls */}
        <div className="flex items-center space-x-2">
          {isRunning && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex items-center text-xs px-2.5 py-1 rounded bg-red-500/20 text-red-500 hover:bg-red-500/30 transition-colors"
              title="Cancel Execution"
            >
              <FaStop className="mr-1" />
              Cancel
            </button>
          )}
          {output && (
            <>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center text-xs px-2.5 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                title="Copy Output"
              >
                {copied ? <MdDone className="mr-1 text-green-500" /> : <FaCopy className="mr-1" />}
                {copied ? "Copied" : "Copy"}
              </button>
              {onClear && (
                <button
                  type="button"
                  onClick={onClear}
                  className="flex items-center text-xs px-2.5 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  title="Clear Output"
                >
                  <FaTrashAlt className="mr-1" />
                  Clear
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Error state banner */}
      {error && (
        <div
          data-testid="output-error-banner"
          className="px-4 py-2 bg-red-500/10 border-b border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center justify-between"
        >
          <span>Error: {error}</span>
        </div>
      )}

      {/* Terminal View */}
      <pre
        ref={terminalRef}
        data-testid="terminal-output"
        className="select-text font-mono text-xs font-semibold lg:text-sm focus:outline-none min-h-32 max-h-[400px] overflow-auto p-5 bg-gray-50/80 dark:bg-black/40 text-gray-800 dark:text-green-400 backdrop-blur-sm"
      >
        {output || "Output will appear here..."}
      </pre>

      {/* AI Simulated Disclaimer */}
      {isSimulated && (
        <p
          data-testid="ai-simulated-disclaimer"
          className="ml-2 my-2 text-xs text-gray-500 italic"
        >
          Execution is AI-simulated via Gemini LLM. Output may differ from native compiler/runtime execution.
        </p>
      )}
    </div>
  );
};

export default OutputPanel;
