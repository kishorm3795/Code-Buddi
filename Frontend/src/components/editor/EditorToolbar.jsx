import React from "react";
import {
  FaPlay,
  FaSpinner,
  FaTrashAlt,
  FaCopy,
  FaDownload,
  FaMagic,
  FaWrench,
  FaShare,
  FaStop,
} from "react-icons/fa";
import { GiBrain } from "react-icons/gi";

/**
 * Shared Action Buttons Toolbar for Code Editors.
 * Renders consistent hacker-glass styled action buttons for
 * Run, Clear, Copy, Download, Generate, Refactor, and Share.
 */
export const EditorToolbar = ({
  buttons = [],
  className = "mt-6 flex flex-wrap justify-center gap-4",
}) => {
  if (!buttons || buttons.length === 0) return null;

  return (
    <div className={className}>
      {buttons.map(
        (
          {
            action,
            onClick,
            bgColor = "bg-blue-500",
            icon,
            text,
            disabled = false,
            title = "",
            className: customBtnClass = "",
            cancelAction,
            isStreaming = false,
          },
          index
        ) => {
          const handleClick = action || onClick;

          return (
            <div key={index} className="inline-flex gap-1 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleClick}
                disabled={disabled}
                title={title || text}
                className={`px-6 py-2.5 ${bgColor} text-white inline-flex items-center justify-center rounded-lg w-full sm:w-auto font-bold text-sm transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,255,255,0.3)] focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed hacker-btn shadow-lg ${customBtnClass}`}
              >
                {icon && <span className="mr-2">{icon}</span>}
                {text}
              </button>
              {isStreaming && cancelAction && (
                <button
                  type="button"
                  onClick={cancelAction}
                  title="Cancel stream"
                  className="px-3 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-xs flex items-center justify-center shadow-lg transition-all"
                >
                  <FaStop />
                </button>
              )}
            </div>
          );
        }
      )}
    </div>
  );
};

export default EditorToolbar;
