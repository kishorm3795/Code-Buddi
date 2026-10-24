import React, { useState } from "react";
import { FaShare, FaSpinner, FaCopy, FaTimes } from "react-icons/fa";
import { MdDone } from "react-icons/md";

const EXPIRY_OPTIONS = [
  { value: 10, label: "10 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 60, label: "1 hour" },
  { value: 1440, label: "1 day" },
  { value: 10080, label: "1 week" },
];

export const ShareModal = ({
  isOpen = false,
  onClose,
  onShare,
  defaultTitle = "Untitled Project",
  isSharing = false,
  generatedLink = null,
}) => {
  const [title, setTitle] = useState(defaultTitle);
  const [expiryTime, setExpiryTime] = useState(30);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (typeof onShare === "function") {
      onShare({ title: title.trim() || defaultTitle, expiryTime });
    }
  };

  const handleCopyLink = async () => {
    if (!generatedLink) return;
    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn("Could not copy link:", err);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700 relative hacker-glass animate-in fade-in duration-200">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          <FaTimes />
        </button>

        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center">
          <FaShare className="mr-2 text-blue-500" />
          {generatedLink ? "Share Link Generated" : "Create Share Link"}
        </h3>

        {!generatedLink ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="share-title-input"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Project Title
              </label>
              <input
                id="share-title-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={defaultTitle}
                className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Expiration Time
              </label>
              <div className="space-y-2">
                {EXPIRY_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center p-2.5 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                  >
                    <input
                      type="radio"
                      name="expiryOption"
                      value={option.value}
                      checked={expiryTime === option.value}
                      onChange={() => setExpiryTime(option.value)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-200">
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <p className="text-xs text-red-500 dark:text-red-300 text-center">
              You can delete shared links at any time from your Homepage.
            </p>

            <div className="flex justify-end space-x-3 pt-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSharing}
                className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg flex items-center shadow-lg transition-all"
              >
                {isSharing ? (
                  <>
                    <FaSpinner className="animate-spin mr-2" />
                    Generating...
                  </>
                ) : (
                  "Create Link"
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Your code is accessible via the link below:
            </p>
            <div className="p-3 bg-gray-100 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 text-xs font-mono break-all select-all">
              {generatedLink}
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-xs text-gray-500">
                Expires in {EXPIRY_OPTIONS.find((o) => o.value === expiryTime)?.label || "30 minutes"}
              </span>
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold text-sm rounded-lg flex items-center transition-colors shadow-lg"
              >
                {copied ? <MdDone className="mr-1" /> : <FaCopy className="mr-1" />}
                {copied ? "Copied!" : "Copy Link"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShareModal;
