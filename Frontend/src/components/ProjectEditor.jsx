import React, { useState, useCallback, useRef, useEffect } from "react";
import { useProject } from "../hooks/useProject";
import FileTree from "./FileTree";
import TabbedEditor from "./editor/TabbedEditor";
import OutputPanel from "./editor/OutputPanel";
import StdinDrawer from "./editor/StdinDrawer";
import EditorToolbar from "./editor/EditorToolbar";
import ProjectSearchModal from "./ProjectSearchModal";
import { useProjectShortcuts } from "../hooks/useProjectShortcuts";
import { useRunCode } from "../hooks/useRunCode";
import { useGenerate } from "../hooks/useGenerate";
import { useRefactor } from "../hooks/useRefactor";
import { useShare } from "../hooks/useShare";
import { downloadCodeFile } from "../utils/fileDownloader";
import { getAllFiles } from "../utils/projectStorage";
import { FaPlay, FaSpinner, FaTrashAlt, FaCopy, FaDownload, FaMagic, FaWrench, FaShare, FaSave, FaFolderPlus, FaFileAlt } from "react-icons/fa";
import { GiBrain } from "react-icons/gi";
import Swal from "sweetalert2/dist/sweetalert2.js";

const ProjectEditor = ({ isDarkMode, projectId }) => {
  const {
    currentProject,
    updateFileContent,
    markFileSaved,
    setActiveFile,
    createFile,
    createFolder,
    renameNode,
    deleteNode,
    duplicateNode,
    saveCurrentProject,
    downloadProject,
    updateProject,
  } = useProject();

  const [deviceType, setDeviceType] = useState("pc");
  const [isEditorReadOnly, setIsEditorReadOnly] = useState(false);
  const [stdin, setStdin] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isBottomPanelOpen, setIsBottomPanelOpen] = useState(true);
  const [outputPanelTab, setOutputPanelTab] = useState('output'); // 'output' | 'terminal' | 'problems'
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  const terminalRef = useRef(null);
  const cpyTimeoutRef = useRef(null);
  const [cpyBtnState, setCpyBtnState] = useState("Copy");

  // Helper functions
  const getActiveFile = useCallback((nodes) => {
    if (!nodes) return null;
    for (const node of nodes) {
      if (node.type === 'file') return node;
      if (node.type === 'folder' && node.children.length > 0) {
        const found = getActiveFile(node.children);
        if (found) return found;
      }
    }
    return null;
  }, []);

  const markAllFilesSaved = useCallback((nodes) => {
    if (!nodes) return;
    const files = getAllFiles(nodes);
    files.forEach(file => markFileSaved(file.id));
  }, [markFileSaved]);

  // Extracted hooks
  const {
    output,
    setOutput,
    isRunning,
    isSimulated,
    engine,
    metrics,
    quota,
    error: runError,
    runCode: executeRun,
    cancelRun,
    clearOutput,
  } = useRunCode({ storageKey: `__project_${projectId}_output__` });

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

  // Responsive device type
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
    if (currentProject) {
      document.title = `${currentProject.name} - CodeBuddi`;
    }
  }, [currentProject]);

  // Handle run code for active file
  const handleRun = useCallback(() => {
    const activeFile = currentProject?.files ?
      getActiveFile(currentProject.files) : null;

    if (!activeFile) return;

    setIsEditorReadOnly(true);
    executeRun({
      code: activeFile.content,
      language: activeFile.language,
      stdin,
      apiEndpoint: `${window.GENAI_API_URL || 'http://localhost:5001'}/get-output`,
      terminalRef,
    }).finally(() => {
      setIsEditorReadOnly(false);
    });
  }, [currentProject, stdin, executeRun, getActiveFile]);

  // Handle generate for active file
  const handleGenerate = useCallback(() => {
    const activeFile = getActiveFile(currentProject?.files);
    if (!activeFile) return;

    setIsEditorReadOnly(true);
    executeGenerate({
      language: activeFile.language,
      setCode: (code) => updateFileContent(activeFile.id, code),
      editorRef: null, // Will need to pass editor ref from TabbedEditor
    }).finally(() => {
      setIsEditorReadOnly(false);
    });
  }, [currentProject, executeGenerate, updateFileContent, getActiveFile]);

  // Handle refactor for active file
  const handleRefactor = useCallback(() => {
    const activeFile = getActiveFile(currentProject?.files);
    if (!activeFile) return;

    setIsEditorReadOnly(true);
    executeRefactor({
      code: activeFile.content,
      language: activeFile.language,
      output,
      setCode: (code) => updateFileContent(activeFile.id, code),
      editorRef: null,
    }).finally(() => {
      setIsEditorReadOnly(false);
    });
  }, [currentProject, output, executeRefactor, updateFileContent, getActiveFile]);

  // Handle share project
  const handleShare = useCallback(() => {
    if (!currentProject) return;
    shareCode({
      code: JSON.stringify({
        name: currentProject.name,
        files: getAllFiles(currentProject.files).map(f => ({
          name: f.name,
          path: f.path,
          content: f.content,
          language: f.language,
        }))
      }),
      language: "project",
      defaultTitlePrefix: currentProject.name,
      storageKeysToClear: [`__project_${projectId}_output__`],
    });
  }, [currentProject, projectId, shareCode]);

  // Save all files
  const handleSaveAll = useCallback(() => {
    saveCurrentProject();
    // Mark all files as saved
    if (currentProject?.files) {
      markAllFilesSaved(currentProject.files);
    }
  }, [saveCurrentProject, currentProject, markAllFilesSaved]);

  // Keyboard shortcuts integration
  useProjectShortcuts({
    onSearchFile: () => setIsSearchModalOpen(true),
    onSaveFile: handleSaveAll,
    onToggleSidebar: () => setIsSidebarOpen((prev) => !prev),
  });

  // Download project as zip
  const handleDownloadProject = useCallback(() => {
    downloadProject(currentProject?.id);
  }, [downloadProject, currentProject]);

  // Create new file
  const handleNewFile = useCallback(() => {
    createFile('untitled.txt');
  }, [createFile]);

  // Create new folder
  const handleNewFolder = useCallback(() => {
    createFolder('new-folder');
  }, [createFolder]);

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
        !currentProject?.files?.some(f => f.type === 'file') ||
        isGenerating ||
        isRefactoring,
      isStreaming: isRunning,
      cancelAction: cancelRun,
    },
    {
      action: handleSaveAll,
      bgColor: "bg-green-500",
      icon: <FaSave className="mr-2 mt-1" />,
      text: "Save All",
      disabled: !currentProject?.files?.some(f => f.type === 'file' && f.isDirty),
    },
    {
      action: handleNewFile,
      bgColor: "bg-purple-500",
      icon: <FaFileAlt className="mr-2 mt-1" />,
      text: "New File",
    },
    {
      action: handleNewFolder,
      bgColor: "bg-indigo-500",
      icon: <FaFolderPlus className="mr-2 mt-1" />,
      text: "New Folder",
    },
    {
      action: () => downloadCodeFile(
        getActiveFile(currentProject?.files)?.content || '',
        getActiveFile(currentProject?.files)?.name || 'file',
        getActiveFile(currentProject?.files)?.language || 'plaintext'
      ),
      bgColor: "bg-orange-500",
      icon: <FaDownload className="mr-2 mt-1" />,
      text: "Download File",
      disabled: !getActiveFile(currentProject?.files),
    },
    {
      action: handleDownloadProject,
      bgColor: "bg-teal-500",
      icon: <FaDownload className="mr-2 mt-1" />,
      text: "Download Project",
      disabled: !currentProject,
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
        !getActiveFile(currentProject?.files) ||
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
        !currentProject ||
        isRunning ||
        isRefactoring ||
        isGenerating ||
        isSharing,
    },
  ];

  if (!currentProject) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <p className="text-lg">No project selected</p>
          <p className="text-sm mt-1">Select a project from the dashboard</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Main Editor Area */}
      <div className="flex-1 flex min-h-0">
        {/* Sidebar - File Tree */}
        <aside
          className={`
            w-72 flex-shrink-0 border-r border-gray-200 dark:border-green-500/10
            transition-all duration-300
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            ${!isSidebarOpen && 'hidden lg:block'}
          `}
        >
          <FileTree />
        </aside>

        {/* Mobile Sidebar Overlay */}
        {!isSidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Editor + Bottom Panel */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Tabbed Editor */}
          <div className="flex-1 min-h-0">
            <TabbedEditor
              isDarkMode={isDarkMode}
              theme={isDarkMode ? "vs-dark" : "vs-light"}
              fontSize={fontSizeMap[deviceType] || 14}
              readOnly={isEditorReadOnly}
              onRunCode={handleRun}
              onGenerate={handleGenerate}
              onRefactor={handleRefactor}
            />
          </div>

          {/* Bottom Panel - Output/Terminal/Problems */}
          {isBottomPanelOpen && (
            <div className="border-t border-gray-200 dark:border-green-500/10 bg-gray-50/50 dark:bg-gray-800/50 hacker-glass">
              {/* Panel Tabs */}
              <div className="flex items-center px-3 py-2 border-b border-gray-200 dark:border-green-500/10 bg-gray-100/50 dark:bg-gray-700/50">
                <div className="flex gap-1">
                  {['output', 'terminal', 'problems'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setOutputPanelTab(tab)}
                      className={`
                        px-3 py-1 text-xs font-mono rounded-t transition-colors
                        ${outputPanelTab === tab
                          ? 'bg-white dark:bg-gray-800 text-green-500 border-b-2 border-green-500'
                          : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-200'
                        }
                      `}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>
                <div className="flex-1" />
                <button
                  onClick={() => setIsBottomPanelOpen(false)}
                  className="p-1 text-gray-500 hover:text-green-400 transition-colors"
                  title="Hide Panel"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-6-6m0 0l6-6m-6 6h18" />
                  </svg>
                </button>
              </div>

              {/* Panel Content */}
              <div className="h-64 overflow-hidden">
                {outputPanelTab === 'output' && (
                  <OutputPanel
                    output={output}
                    isRunning={isRunning}
                    isSimulated={isSimulated}
                    metrics={metrics}
                    quota={quota}
                    engine={engine}
                    error={runError}
                    terminalRef={terminalRef}
                    onClear={clearOutput}
                    onCancel={cancelRun}
                  />
                )}
                {outputPanelTab === 'terminal' && (
                  <div className="h-full bg-black text-green-400 font-mono text-sm p-3 overflow-auto">
                    <div>Terminal not yet implemented</div>
                    <div className="mt-2">Click to focus...</div>
                  </div>
                )}
                {outputPanelTab === 'problems' && (
                  <div className="h-full p-3 text-gray-500 dark:text-gray-400">
                    <div>No problems detected</div>
                    <div className="text-xs mt-2">Problems panel will show linting errors</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Stdin Drawer */}
          <StdinDrawer stdin={stdin} setStdin={setStdin} disabled={isRunning} />
        </div>
      </div>

      {/* Toolbar */}
      <EditorToolbar buttons={buttonsConfig} />

      {/* Quick Search Modal */}
      <ProjectSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        files={currentProject?.files || []}
        onSelectFile={(file) => setActiveFile(file.id)}
      />

      {/* Mobile Sidebar Toggle */}
      <button
        className="lg:hidden fixed bottom-4 left-4 z-50 p-3 bg-green-500 text-white rounded-full shadow-lg hacker-glow"
        onClick={() => setIsSidebarOpen(true)}
        aria-label="Open file explorer"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" />
        </svg>
      </button>
    </div>
  );
};

export default ProjectEditor;