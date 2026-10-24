import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  FaPlay,
  FaSpinner,
  FaTrashAlt,
  FaCopy,
  FaDownload,
  FaMagic,
  FaWrench,
  FaShare,
} from "react-icons/fa";
import { GiBrain } from "react-icons/gi";
import { useRunCode } from "../hooks/useRunCode";
import { useGenerate } from "../hooks/useGenerate";
import { useRefactor } from "../hooks/useRefactor";
import { useShare } from "../hooks/useShare";
import LazyMonacoEditor from "./editor/LazyMonacoEditor";
import EditorToolbar from "./editor/EditorToolbar";
import OutputPanel from "./editor/OutputPanel";
import { downloadCodeFile } from "../utils/fileDownloader";
import { loadSampleCode } from "../utils/sampleLoader";

const CodeEditor = ({
  language,
  reactIcon,
  apiEndpoint,
  isDarkMode,
  defaultCode,
  title,
  shareIdData,
}) => {
  const codeStorageKey = `__${shareIdData || language}Code__`;
  const outputStorageKey = `__${shareIdData || language}Output__`;

  const [code, setCode] = useState(() => {
    const saved = sessionStorage.getItem(codeStorageKey);
    if (saved !== null) return saved;
    return defaultCode || "";
  });

  const [deviceType, setDeviceType] = useState("pc");
  const [cpyBtnState, setCpyBtnState] = useState("Copy");
  const [isEditorReadOnly, setIsEditorReadOnly] = useState(false);

  const editorRef = useRef(null);
  const terminalRef = useRef(null);
  const cpyTimeoutRef = useRef(null);

  // Extracted hooks
  const {
    output,
    setOutput,
    isRunning,
    isSimulated,
    error: runError,
    runCode: executeRun,
    cancelRun,
    clearOutput,
  } = useRunCode({ storageKey: outputStorageKey });

  const {
    generateCode: executeGenerate,
    cancelGenerate,
    isGenerating,
    loadingAction: genLoadingAction,
  } = useGenerate();

  const {
    refactorCode: executeRefactor,
    cancelRefactor,
    isRefactoring,
    loadingAction: refactorLoadingAction,
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

  // Asynchronously load sample code if none is provided or saved
  useEffect(() => {
    let isMounted = true;
    if (!shareIdData && !sessionStorage.getItem(codeStorageKey) && !defaultCode) {
      loadSampleCode(language).then((sample) => {
        if (isMounted && sample) {
          setCode(sample);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [language, shareIdData, codeStorageKey, defaultCode]);

  // Persist code in sessionStorage
  useEffect(() => {
    sessionStorage.setItem(codeStorageKey, code);
  }, [code, codeStorageKey]);

  // Responsive device type resize listener
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

  // Update document title
  useEffect(() => {
    const formattedTitle = title
      ? `${title.charAt(0).toUpperCase()}${title.slice(1)}`
      : `${language.charAt(0).toUpperCase() + language.slice(1)} Playground`;
    document.title = formattedTitle;
  }, [title, language]);

  // Prevent default save shortcut
  const handleCtrlS = useCallback(
    (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "s") {
        event.preventDefault();
        downloadCodeFile(code, "file", language);
      }
    },
    [code, language]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleCtrlS);
    return () => document.removeEventListener("keydown", handleCtrlS);
  }, [handleCtrlS]);

  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;
  };

  const clearAll = useCallback(() => {
    setCode("");
    clearOutput();
    sessionStorage.removeItem(codeStorageKey);
    sessionStorage.removeItem(outputStorageKey);
  }, [codeStorageKey, outputStorageKey, clearOutput]);

  const handleCopy = useCallback(async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCpyBtnState("Copied!");
      if (cpyTimeoutRef.current) clearTimeout(cpyTimeoutRef.current);
      cpyTimeoutRef.current = setTimeout(() => {
        setCpyBtnState("Copy");
      }, 1500);
    } catch (err) {
      console.warn("Could not copy code:", err);
    }
  }, [code]);

  const handleRun = useCallback(() => {
    setIsEditorReadOnly(true);
    executeRun({
      code,
      language,
      apiEndpoint,
      terminalRef,
    }).finally(() => {
      setIsEditorReadOnly(false);
    });
  }, [code, language, apiEndpoint, executeRun]);

  const handleGenerate = useCallback(() => {
    setIsEditorReadOnly(true);
    executeGenerate({
      language,
      setCode,
      editorRef,
    }).finally(() => {
      setIsEditorReadOnly(false);
    });
  }, [language, executeGenerate]);

  const handleRefactor = useCallback(() => {
    setIsEditorReadOnly(true);
    executeRefactor({
      code,
      language,
      output,
      setCode,
      editorRef,
    }).finally(() => {
      setIsEditorReadOnly(false);
    });
  }, [code, language, output, executeRefactor]);

  const handleShare = useCallback(() => {
    shareCode({
      code,
      language,
      defaultTitlePrefix: language,
      storageKeysToClear: [codeStorageKey, outputStorageKey],
    });
  }, [code, language, codeStorageKey, outputStorageKey, shareCode]);

  const buttonsConfig = [
    {
      action: handleRun,
      bgColor: "bg-blue-500",
      icon: isRunning ? (
        <FaSpinner className="mr-2 mt-1 animate-spin" />
      ) : (
        <FaPlay className="mr-2 mt-1" />
      ),
      text: isRunning ? "Running..." : "Run",
      disabled:
        isRunning ||
        code.trim().length === 0 ||
        isGenerating ||
        isRefactoring,
      isStreaming: isRunning,
      cancelAction: cancelRun,
    },
    {
      action: clearAll,
      bgColor: "bg-red-500",
      icon: <FaTrashAlt className="mr-2 mt-1" />,
      text: "Clear All",
      disabled:
        code.trim().length === 0 ||
        isGenerating ||
        isRefactoring ||
        isRunning,
    },
    {
      action: handleCopy,
      bgColor: "bg-purple-500",
      icon: <FaCopy className="mr-2 mt-1" />,
      text: cpyBtnState,
      disabled: code.trim().length === 0,
    },
    {
      action: () => downloadCodeFile(code, "file", language),
      bgColor: "bg-orange-500",
      icon: <FaDownload className="mr-2 mt-1" />,
      text: "Download",
      disabled: code.trim().length === 0,
    },
    {
      action: handleGenerate,
      bgColor: "bg-green-500",
      icon:
        genLoadingAction === "thinking" ? (
          <GiBrain className="mr-2 mt-1 animate-bounce" />
        ) : isGenerating ? (
          <FaSpinner className="mr-2 mt-1 animate-spin" />
        ) : (
          <FaMagic className="mr-2 mt-1" />
        ),
      text:
        genLoadingAction === "thinking"
          ? "Thinking..."
          : isGenerating
          ? "Generating..."
          : "Generate",
      disabled: isRunning || isRefactoring || isGenerating,
      isStreaming: isGenerating,
      cancelAction: cancelGenerate,
    },
    {
      action: handleRefactor,
      bgColor: "bg-yellow-500",
      icon:
        refactorLoadingAction === "thinking" ? (
          <GiBrain className="mr-2 mt-1 animate-bounce" />
        ) : isRefactoring ? (
          <FaSpinner className="mr-2 mt-1 animate-spin" />
        ) : (
          <FaWrench className="mr-2 mt-1" />
        ),
      text:
        refactorLoadingAction === "thinking"
          ? "Thinking..."
          : isRefactoring
          ? "Refactoring..."
          : "Refactor",
      disabled:
        code.trim().length === 0 ||
        isRunning ||
        isGenerating ||
        isRefactoring,
      isStreaming: isRefactoring,
      cancelAction: cancelRefactor,
    },
    {
      action: handleShare,
      bgColor: "bg-fuchsia-500",
      icon: isSharing ? (
        <FaSpinner className="mr-2 mt-1 animate-spin" />
      ) : (
        <FaShare className="mr-2 mt-1" />
      ),
      text: isSharing ? "Sharing..." : "Share",
      disabled:
        code.trim().length === 0 ||
        isRunning ||
        isRefactoring ||
        isGenerating ||
        isSharing,
    },
  ];

  const capitalizedLang =
    language.charAt(0).toUpperCase() + language.slice(1);

  return (
    <div className="mx-auto p-4 max-w-6xl">
      <div className="bg-white dark:bg-gray-800/50 backdrop-blur-md rounded-xl shadow-lg border border-gray-200 dark:border-green-500/20 overflow-hidden hacker-glass">
        {/* Editor Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50/50 dark:bg-gray-800/30 border-b border-gray-200 dark:border-green-500/10">
          <div className="flex items-center space-x-3">
            {reactIcon && (
              <div className="p-2 bg-gradient-to-br from-green-400 to-blue-500 rounded-lg shadow-lg">
                {React.createElement(reactIcon, {
                  className: "text-xl text-white",
                })}
              </div>
            )}
            <div>
              <h1 className="text-lg font-bold text-gray-800 dark:text-green-400">
                {capitalizedLang}
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Interactive {capitalizedLang} Playground
              </p>
            </div>
          </div>
        </div>

        {/* Lazy-loaded Monaco Editor */}
        <LazyMonacoEditor
          language={language}
          value={code}
          onChange={(newVal) => setCode(newVal || "")}
          onMount={handleEditorDidMount}
          theme={isDarkMode ? "vs-dark" : "vs-light"}
          height="500px"
          options={{
            minimap: { enabled: false },
            matchBrackets: "always",
            fontFamily: "Source Code Pro",
            renderValidationDecorations: "on",
            scrollbar: { vertical: "visible", horizontal: "visible" },
            fontWeight: "bold",
            formatOnPaste: true,
            semanticHighlighting: true,
            folding: !deviceType.includes("mobile"),
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: true,
            cursorStyle: "line",
            fontSize: fontSizeMap[deviceType] || 14,
            readOnly: isEditorReadOnly,
            scrollBeyondLastLine: false,
          }}
        />
      </div>

      {/* Shared Action Toolbar */}
      <EditorToolbar buttons={buttonsConfig} />

      {/* Shared Output Panel */}
      <OutputPanel
        output={output}
        isRunning={isRunning}
        isSimulated={isSimulated}
        error={runError}
        terminalRef={terminalRef}
        onClear={clearOutput}
        onCancel={cancelRun}
      />
    </div>
  );
};

export default CodeEditor;
