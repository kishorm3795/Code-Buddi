import React, { useState } from "react";
import { FaKeyboard, FaChevronDown, FaChevronUp, FaTimes } from "react-icons/fa";

/**
 * StdinDrawer allows users to provide standard input (stdin)
 * before running code in interactive environments.
 */
export const StdinDrawer = ({ stdin = "", setStdin, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mt-4 hacker-glass rounded-xl overflow-hidden border border-gray-200 dark:border-green-500/20 shadow-md">
      {/* Header / Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full bg-gray-50/70 dark:bg-gray-800/40 p-2.5 px-4 flex items-center justify-between text-left hover:bg-gray-100/50 dark:hover:bg-gray-800/60 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <FaKeyboard className="text-gray-500 dark:text-green-400 text-sm" />
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
            Standard Input (stdin)
          </span>
          {stdin.trim() && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 font-mono">
              {stdin.trim().length} chars
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2 text-gray-400">
          <span className="text-[11px] text-gray-500">
            {isOpen ? "Hide" : "Provide Input"}
          </span>
          {isOpen ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
        </div>
      </button>

      {/* Collapsible Textarea */}
      {isOpen && (
        <div className="p-3 bg-white/50 dark:bg-gray-900/40 border-t border-gray-200 dark:border-green-500/10">
          <div className="relative">
            <textarea
              value={stdin}
              onChange={(e) => setStdin(e.target.value)}
              disabled={disabled}
              placeholder="Enter standard input (stdin) for your program here..."
              rows={3}
              className="w-full bg-gray-50 dark:bg-black/40 text-gray-800 dark:text-green-300 font-mono text-xs p-2.5 rounded-lg border border-gray-200 dark:border-green-500/20 focus:outline-none focus:border-green-500 resize-y"
            />
            {stdin && (
              <button
                type="button"
                onClick={() => setStdin("")}
                className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-400 transition-colors"
                title="Clear stdin"
              >
                <FaTimes size={12} />
              </button>
            )}
          </div>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
            Input lines are supplied directly to standard input during sandboxed execution.
          </p>
        </div>
      )}
    </div>
  );
};

export default StdinDrawer;
