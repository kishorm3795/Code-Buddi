import React, { useState, useEffect, useCallback, useRef } from "react";
import debounce from "lodash/debounce";
import { SlSizeFullscreen } from "react-icons/sl";
import { IoMdRefreshCircle } from "react-icons/io";
import { MdPreview } from "react-icons/md";
import { FaTrashAlt, FaDownload, FaSpinner, FaMagic, FaWrench, FaShare } from "react-icons/fa";
import { BiTerminal } from "react-icons/bi";
import LazyMonacoEditor from "./editor/LazyMonacoEditor";
import EditorToolbar from "./editor/EditorToolbar";
import { useGenerate } from "../hooks/useGenerate";
import { useRefactor } from "../hooks/useRefactor";
import { useShare } from "../hooks/useShare";
import { loadHtmlCssJsSamples } from "../utils/sampleLoader";

const blocker = `
  window.alert = function() { console.warn("alert() blocked in preview"); };
  window.confirm = function() { console.warn("confirm() blocked in preview"); return false; };
  window.prompt = function() { console.warn("prompt() blocked in preview"); return null; };
`;

const EditorSection = ({
  language,
  value,
  onChange,
  theme,
  fontSize,
  readOnly,
  editorDidMount,
}) => {
  const capFirst = (str) => {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const getGradient = () => {
    switch (language) {
      case "html":
        return "from-orange-500 to-red-500";
      case "css":
        return "from-blue-500 to-green-500";
      case "javascript":
        return "from-yellow-400 to-amber-500";
      default:
        return "from-gray-500 to-gray-600";
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800/50 backdrop-blur-md rounded-xl shadow-lg border border-gray-200 dark:border-green-500/20 overflow-hidden hacker-glass">
      {/* Section Header */}
      <div className="flex items-center px-4 py-3 bg-gray-50/50 dark:bg-gray-800/30 border-b border-gray-200 dark:border-green-500/10">
        <div className={`p-2 bg-gradient-to-br ${getGradient()} rounded-lg mr-3 shadow-lg`}>
          <BiTerminal className="text-lg text-white" />
        </div>
        <h2 className="text-base font-bold text-gray-700 dark:text-green-400 tracking-wider">
          {capFirst(language)}
        </h2>
      </div>

      <LazyMonacoEditor
        language={language}
        value={value}
        onMount={editorDidMount(language)}
        onChange={(newValue) => onChange(language, newValue || "")}
        loading={`Loading ${capFirst(language)} Editor...`}
        options={{
          minimap: { enabled: false },
          matchBrackets: "always",
          fontFamily: "JetBrains Mono",
          renderValidationDecorations: "on",
          scrollbar: { vertical: "visible", horizontal: "visible" },
          fontWeight: "bold",
          formatOnPaste: true,
          semanticHighlighting: true,
          folding: true,
          cursorBlinking: "smooth",
          cursorSmoothCaretAnimation: true,
          scrollBeyondLastLine: false,
          cursorStyle: "line",
          fontSize,
          readOnly,
        }}
        height="300px"
        theme={theme}
      />
    </div>
  );
};

const Editor = ({ isDarkMode, value, title, shareIdData }) => {
  const storageKey = `__${shareIdData || "htmlcssjs"}Code__`;

  const [code, setCode] = useState(() => {
    const savedCode = sessionStorage.getItem(storageKey);
    if (savedCode) {
      try {
        return JSON.parse(savedCode);
      } catch {
        // fallback
      }
    }
    return value || { html: "", css: "", javascript: "" };
  });

  const [deviceType, setDeviceType] = useState("pc");
  const [isPreviewEnabled, setIsPreviewEnabled] = useState(true);
  const [isEditorReadOnly, setIsEditorReadOnly] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOverlayVisible, setIsOverlayVisible] = useState(false);
  const [overlayText, setOverlayText] = useState("");

  const iframeRef = useRef(null);
  const editorRefs = useRef({});

  const {
    generateHtmlCssJs,
    cancelGenerate,
    isGenerating,
  } = useGenerate();

  const {
    refactorHtmlCssJs,
    cancelRefactor,
    isRefactoring,
  } = useRefactor();

  const { shareCode, isSharing } = useShare();

  const fontSizeMap = {
    "mobile-s": 10,
    "mobile-m": 12,
    "mobile-l": 14,
    tablet: 14,
    laptop: 14,
    pc: 14,
  };

  const languages = ["html", "css", "javascript"];

  // Asynchronously load sample code if none provided or saved
  useEffect(() => {
    let isMounted = true;
    if (
      !shareIdData &&
      !sessionStorage.getItem(storageKey) &&
      (!value || (!value.html && !value.css && !value.javascript))
    ) {
      loadHtmlCssJsSamples().then((samples) => {
        if (isMounted && samples) {
          setCode(samples);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [shareIdData, storageKey, value]);

  useEffect(() => {
    const formattedTitle = title
      ? `${title.charAt(0).toUpperCase()}${title.slice(1)}`
      : "HTML, CSS & JS Playground";
    document.title = formattedTitle;
  }, [title]);

  useEffect(() => {
    sessionStorage.setItem(storageKey, JSON.stringify(code));
  }, [code, storageKey]);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 320) setDeviceType("mobile-s");
      else if (width < 375) setDeviceType("mobile-m");
      else if (width < 425) setDeviceType("mobile-l");
      else if (width < 768) setDeviceType("tablet");
      else if (width < 1024) setDeviceType("laptop");
      else setDeviceType("pc");
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const editorDidMount = (id) => (editor) => {
    editorRefs.current[id] = editor;
  };

  const updatePreview = useCallback(
    debounce(() => {
      if (!isPreviewEnabled || !iframeRef.current) return;

      try {
        const { html, css, javascript } = code;
        const iframeDocument =
          iframeRef.current.contentDocument ||
          iframeRef.current.contentWindow?.document;

        if (!iframeDocument) return;

        iframeDocument.open();
        iframeDocument.write(`
        <!DOCTYPE html>
        <html style="scrollbar-width: thin;">
          <head>
            <style>${css?.trim() || ""}</style>
            <script>${blocker}</script>
          </head>
          <body>
            ${html?.trim() || ""}
            <script>
              (function() {
                try {
                  ${javascript?.trim() || ""}
                } catch (error) {
                  console.error("Error executing JS:", error);
                }
              })();
            </script>
          </body>
        </html>
      `);
        iframeDocument.close();
      } catch (err) {
        console.warn("Could not render iframe preview:", err);
      }
    }, 500),
    [code, isPreviewEnabled]
  );

  useEffect(() => {
    updatePreview();
  }, [code, updatePreview]);

  const openPreviewFullScreen = () => {
    try {
      const { html, css, javascript } = code;
      const newWindow = window.open("", "_blank");
      if (!newWindow) return;

      newWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Preview</title>
        <style>${css?.trim() || ""}</style>
        <script>${blocker}</script>
      </head>
      <body>
        ${html?.trim() || ""}
        <script>
          (function() {
            try {
              ${javascript?.trim() || ""}
            } catch (error) {
              console.error("Error executing JS:", error);
            }
          })();
        </script>
      </body>
      </html>
    `);
      newWindow.document.close();
    } catch (err) {
      console.warn("Could not open preview full screen:", err);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    updatePreview();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  const handleEditorChange = (lang, newVal) => {
    setCode((prev) => ({ ...prev, [lang]: newVal }));
  };

  const clearAll = () => {
    const emptyCode = { html: "", css: "", javascript: "" };
    setCode(emptyCode);
    sessionStorage.removeItem(storageKey);

    if (iframeRef.current) {
      const iframeDocument =
        iframeRef.current.contentDocument ||
        iframeRef.current.contentWindow?.document;

      if (iframeDocument) {
        setIsPreviewEnabled(false);
        iframeDocument.open();
        iframeDocument.write(`<!DOCTYPE html><html><head></head><body></body></html>`);
        iframeDocument.close();
        setIsPreviewEnabled(true);
      }
    }
  };

  const downloadFile = () => {
    const { html, css, javascript } = code;
    if (!html?.trim() && !css?.trim() && !javascript?.trim()) return;

    const cleanedHtml = (html || "")
      .replace(/<html.*?>|<\/html>/gi, "")
      .replace(/<head.*?>|<\/head>/gi, "")
      .replace(/<body.*?>|<\/body>/gi, "");

    const finalHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>${css || ""}</style>
        </head>
        <body>
          ${cleanedHtml || ""}
          <script>${javascript || ""}</script>
        </body>
      </html>
    `;

    const blob = new Blob([finalHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "file.html";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const scrollToLastLine = (editorId) => {
    const editor = editorRefs.current[editorId];
    if (editor) {
      const model = editor.getModel();
      if (model) {
        const lastLine = model.getLineCount();
        editor.revealLineInCenter(lastLine);
      }
    }
  };

  const handleCtrlS = useCallback(
    (event) => {
      const { html, css, javascript } = code;
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key === "s" &&
        (html?.trim() || css?.trim() || javascript?.trim())
      ) {
        event.preventDefault();
        downloadFile();
      }
    },
    [code]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleCtrlS);
    return () => document.removeEventListener("keydown", handleCtrlS);
  }, [handleCtrlS]);

  const handleGenerate = () => {
    setIsOverlayVisible(true);
    setIsEditorReadOnly(true);
    generateHtmlCssJs({
      setCode,
      setOverlayText,
      setIsPreviewEnabled,
      languages,
      scrollToLastLine,
      onStart: () => {
        setIsOverlayVisible(true);
        setIsEditorReadOnly(true);
      },
      onComplete: () => {
        setIsOverlayVisible(false);
        setIsEditorReadOnly(false);
      },
    }).finally(() => {
      setIsOverlayVisible(false);
      setIsEditorReadOnly(false);
    });
  };

  const handleRefactor = () => {
    setIsOverlayVisible(true);
    setIsEditorReadOnly(true);
    refactorHtmlCssJs({
      code,
      setCode,
      setOverlayText,
      setIsPreviewEnabled,
      languages,
      scrollToLastLine,
      onStart: () => {
        setIsOverlayVisible(true);
        setIsEditorReadOnly(true);
      },
      onComplete: () => {
        setIsOverlayVisible(false);
        setIsEditorReadOnly(false);
      },
    }).finally(() => {
      setIsOverlayVisible(false);
      setIsEditorReadOnly(false);
    });
  };

  const handleShare = () => {
    shareCode({
      code,
      language: "htmlcssjs",
      defaultTitlePrefix: "htmlcssjs",
      storageKeysToClear: [storageKey],
    });
  };

  const hasCode =
    code.html.trim().length > 0 ||
    code.css.trim().length > 0 ||
    code.javascript.trim().length > 0;

  const buttonData = [
    {
      text: "Clear All",
      icon: <FaTrashAlt className="mr-2 mt-1" />,
      onClick: clearAll,
      disabled: !hasCode || isGenerating || isRefactoring,
      bgColor: "bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20",
    },
    {
      text: "Download",
      icon: <FaDownload className="mr-2 mt-1" />,
      onClick: downloadFile,
      disabled: !hasCode,
      bgColor: "bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/20",
    },
    {
      text: isGenerating ? "Generating..." : "Generate",
      icon: isGenerating ? (
        <FaSpinner className="mr-2 mt-1 animate-spin" />
      ) : (
        <FaMagic className="mr-2 mt-1" />
      ),
      onClick: handleGenerate,
      disabled: isGenerating || isRefactoring,
      bgColor:
        "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-lg shadow-green-500/20",
      isStreaming: isGenerating,
      cancelAction: cancelGenerate,
    },
    {
      text: isRefactoring ? "Refactoring..." : "Refactor",
      icon: isRefactoring ? (
        <FaSpinner className="mr-2 mt-1 animate-spin" />
      ) : (
        <FaWrench className="mr-2 mt-1" />
      ),
      onClick: handleRefactor,
      disabled: !hasCode || isGenerating || isRefactoring,
      bgColor:
        "bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 shadow-lg shadow-yellow-500/20",
      isStreaming: isRefactoring,
      cancelAction: cancelRefactor,
    },
    {
      text: isSharing ? "Sharing..." : "Share",
      icon: isSharing ? (
        <FaSpinner className="mr-2 mt-1 animate-spin" />
      ) : (
        <FaShare className="mr-2 mt-1" />
      ),
      onClick: handleShare,
      disabled: !hasCode || isGenerating || isRefactoring || isSharing,
      bgColor:
        "bg-gradient-to-r from-fuchsia-500 to-purple-500 hover:from-fuchsia-600 hover:to-purple-600 shadow-lg shadow-fuchsia-500/20",
    },
  ];

  return (
    <div className="mx-auto p-4 max-w-7xl">
      <div className="grid grid-cols-1 lg:grid-cols-3 md:grid-cols-2 gap-4">
        {languages.map((language) => (
          <EditorSection
            key={language}
            language={language}
            value={code[language]}
            editorDidMount={editorDidMount}
            onChange={handleEditorChange}
            theme={isDarkMode ? "vs-dark" : "vs-light"}
            fontSize={fontSizeMap[deviceType] || 14}
            readOnly={isEditorReadOnly}
          />
        ))}
      </div>

      {/* Shared Action Buttons */}
      <EditorToolbar buttons={buttonData} />

      {/* Preview Panel */}
      <div className="mt-4 relative flex flex-col items-start bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Preview Header */}
        <div className="flex items-center justify-between w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <MdPreview className="text-xl text-green-500" />
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Preview</h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Refresh Button */}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing || isOverlayVisible}
              className={`p-2 rounded-lg transition-all duration-300 ${
                isRefreshing
                  ? "text-green-500 animate-spin"
                  : "text-gray-500 hover:text-green-500 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
              title="Refresh Preview"
            >
              <IoMdRefreshCircle className="text-2xl" />
            </button>

            {/* Fullscreen Button */}
            <button
              type="button"
              onClick={openPreviewFullScreen}
              disabled={isOverlayVisible}
              className="p-2 rounded-lg text-gray-500 hover:text-green-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300"
              title="Fullscreen Preview"
            >
              <SlSizeFullscreen className="text-xl" />
            </button>
          </div>
        </div>

        {/* Loading Overlay */}
        {isOverlayVisible && overlayText && (
          <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md flex justify-center items-center z-10 hacker-glass">
            <div className="flex flex-col items-center space-y-4 bg-white/50 dark:bg-gray-800/50 px-8 py-6 rounded-2xl shadow-2xl border border-green-500/30 hacker-card-advanced">
              <FaSpinner className="text-4xl text-green-400 animate-spin" />
              <span className="text-lg font-bold text-gray-700 dark:text-green-400 hacker-holographic animate-pulse">
                {overlayText}
              </span>
            </div>
          </div>
        )}

        {/* Iframe Preview */}
        <iframe
          ref={iframeRef}
          title="Preview"
          className="w-full h-96 bg-white"
          referrerPolicy="no-referrer"
        />
      </div>
    </div>
  );
};

export default Editor;
