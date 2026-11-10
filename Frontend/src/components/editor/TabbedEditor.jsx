import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { FaTimes, FaFileCode, FaSave, FaDownload, FaPlay } from "react-icons/fa";
import LazyMonacoEditor from "./LazyMonacoEditor";
import { useProject } from "../../hooks/useProject";

const getFileIcon = (language) => {
  const icons = {
    python: '🐍',
    javascript: '🟨',
    typescript: '🔷',
    java: '☕',
    csharp: '🔷',
    go: '🐹',
    rust: '🦀',
    ruby: '💎',
    php: '🐘',
    swift: '🐦',
    kotlin: '🟣',
    dart: '🎯',
    scala: '🔴',
    julia: '🟪',
    c: '🔵',
    cpp: '🔵',
    html: '🌐',
    css: '🎨',
    json: '📋',
    markdown: '📝',
    sql: '🗄️',
    shell: '🐚',
    yaml: '📄',
    toml: '📄',
    dockerfile: '🐳',
    plaintext: '📄',
  };
  return icons[language] || '📄';
};

const TabBar = ({ tabs, activeTabId, onTabClick, onTabClose, onTabDoubleClick }) => {
  const tabsContainerRef = useRef(null);
  const [showOverflow, setShowOverflow] = useState(false);
  const [overflowTabs, setOverflowTabs] = useState([]);

  // Calculate visible tabs based on container width
  useEffect(() => {
    const calculateOverflow = () => {
      if (!tabsContainerRef.current) return;

      const containerWidth = tabsContainerRef.current.offsetWidth - 120; // Reserve space for buttons
      let totalWidth = 0;
      const visible = [];
      const overflow = [];

      for (const tab of tabs) {
        const tabWidth = Math.min(200, Math.max(120, tab.name.length * 8 + 60));
        if (totalWidth + tabWidth <= containerWidth) {
          visible.push(tab);
          totalWidth += tabWidth;
        } else {
          overflow.push(tab);
        }
      }

      setOverflowTabs(overflow);
      setShowOverflow(overflow.length > 0);
    };

    calculateOverflow();
    window.addEventListener('resize', calculateOverflow);
    return () => window.removeEventListener('resize', calculateOverflow);
  }, [tabs]);

  const visibleTabs = showOverflow ? tabs.slice(0, -overflowTabs.length) : tabs;

  return (
    <div className="flex items-center h-9 bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-green-500/10 px-2 gap-1">
      <div ref={tabsContainerRef} className="flex-1 flex items-center overflow-hidden gap-0.5">
        {visibleTabs.map((tab) => (
          <TabItem
            key={tab.id}
            tab={tab}
            isActive={tab.id === activeTabId}
            onClick={onTabClick}
            onClose={onTabClose}
            onDoubleClick={onTabDoubleClick}
            icon={getFileIcon(tab.language)}
          />
        ))}
        {showOverflow && (
          <OverflowMenu tabs={overflowTabs} activeTabId={activeTabId} onTabClick={onTabClick} onTabClose={onTabClose} />
        )}
      </div>
      <div className="flex items-center gap-1 ml-2 border-l border-gray-200 dark:border-green-500/10 pl-2">
        <button
          onClick={() => { /* New file - handled by parent */ }}
          className="p-1.5 text-gray-500 hover:text-green-400 hover:bg-gray-700/50 rounded transition-colors"
          title="New File (Ctrl+N)"
        >
          <FaFileCode className="text-sm" />
        </button>
      </div>
    </div>
  );
};

const TabItem = ({ tab, isActive, onClick, onClose, onDoubleClick, icon }) => {
  const tabRef = useRef(null);

  const handleClick = (e) => {
    if (e.target.closest('button')) return;
    onClick(tab.id);
  };

  const handleDoubleClick = (e) => {
    if (e.target.closest('button')) return;
    onDoubleClick(tab.id);
  };

  const handleClose = (e) => {
    e.stopPropagation();
    onClose(tab.id);
  };

  return (
    <div
      ref={tabRef}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      className={`
        flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg transition-all
        ${isActive
          ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white hacker-border'
          : 'bg-gray-100/50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-600/50'
        }
        min-w-[120px] max-w-[200px]
      `}
      title={tab.path}
    >
      <span className="text-xs">{icon}</span>
      <span className="truncate font-mono text-sm flex-1">
        {tab.name}
        {tab.isDirty && <span className="ml-1 text-yellow-400">●</span>}
      </span>
      <button
        onClick={handleClose}
        className={`
          p-0.5 rounded transition-colors flex-shrink-0
          ${isActive ? 'text-gray-500 hover:text-red-500' : 'text-gray-400 hover:text-red-500'}
        `}
        title="Close tab"
      >
        <FaTimes className="text-xs" />
      </button>
    </div>
  );
};

const OverflowMenu = ({ tabs, activeTabId, onTabClick, onTabClose }) => {
  const menuRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-2 py-1.5 text-gray-500 hover:text-green-400 hover:bg-gray-700/50 rounded transition-colors"
        title="More tabs"
      >
        ⋯
      </button>
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 z-20 hacker-glass hacker-border rounded-lg shadow-xl py-1 min-w-[180px]">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              onClick={() => { onTabClick(tab.id); setIsOpen(false); }}
              className={`px-3 py-2 text-sm font-mono truncate transition-colors flex items-center gap-2 ${
                tab.id === activeTabId ? 'bg-green-500/20 text-green-400' : 'text-gray-300 hover:bg-gray-700/50'
              }`}
            >
              <span className="text-xs">{getFileIcon(tab.language)}</span>
              <span className="flex-1 truncate">{tab.name}</span>
              <button
                onClick={(e) => { e.stopPropagation(); onTabClose(tab.id); setIsOpen(false); }}
                className="text-gray-500 hover:text-red-400 p-0.5"
              >
                <FaTimes className="text-xs" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


const TabbedEditor = ({
  theme = 'vs-dark',
  fontSize = 14,
  readOnly = false,
  onRunCode,
  onGenerate,
  onRefactor,
}) => {
  const {
    currentProject,
    getOpenFiles,
    updateFileContent,
    markFileSaved,
    setActiveFile,
    createFile,
  } = useProject();

  const [activeTabId, setActiveTabId] = useState(null);
  const editorRef = useRef(null);
  const modelRefs = useRef({}); // fileId -> monaco model
  const [editorMounted, setEditorMounted] = useState(false);

  const openFiles = getOpenFiles();

  // Sync active tab with project's active file
  useEffect(() => {
    if (currentProject?.activeFileId && currentProject.activeFileId !== activeTabId) {
      setActiveTabId(currentProject.activeFileId);
    } else if (!currentProject?.activeFileId && openFiles.length > 0) {
      setActiveTabId(openFiles[0].id);
    }
  }, [currentProject?.activeFileId, openFiles, activeTabId]);

  // Auto-select first tab if none selected
  useEffect(() => {
    if (!activeTabId && openFiles.length > 0) {
      setActiveTabId(openFiles[0].id);
      setActiveFile(openFiles[0].id);
    }
  }, [openFiles, activeTabId, setActiveFile]);

  const activeFile = useMemo(
    () => openFiles.find((f) => f.id === activeTabId),
    [openFiles, activeTabId]
  );

  const handleEditorMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    setEditorMounted(true);

    // Create models for all open files
    openFiles.forEach((file) => {
      if (!modelRefs.current[file.id]) {
        const uri = monaco.Uri.file(file.path);
        const model = monaco.editor.createModel(
          file.content || '',
          file.language,
          uri
        );
        modelRefs.current[file.id] = model;
      }
    });

    // Set active model
    if (activeFile && modelRefs.current[activeFile.id]) {
      editor.setModel(modelRefs.current[activeFile.id]);
    }
  }, [openFiles, activeFile]);

  const handleEditorChange = useCallback((value, e) => {
    if (!activeFile) return;
    updateFileContent(activeFile.id, value);
  }, [activeFile, updateFileContent]);

  const handleTabClick = useCallback((fileId) => {
    setActiveTabId(fileId);
    setActiveFile(fileId);

    // Switch Monaco model
    if (editorRef.current && modelRefs.current[fileId]) {
      editorRef.current.setModel(modelRefs.current[fileId]);
    }
  }, [setActiveFile]);

  const handleTabClose = useCallback((fileId) => {
    const fileIndex = openFiles.findIndex((f) => f.id === fileId);
    if (fileIndex === -1) return;

    // Dispose Monaco model
    if (modelRefs.current[fileId]) {
      modelRefs.current[fileId].dispose();
      delete modelRefs.current[fileId];
    }

    // If closing active tab, switch to adjacent
    if (activeTabId === fileId) {
      const newActive = openFiles[fileIndex + 1] || openFiles[fileIndex - 1];
      if (newActive) {
        setActiveTabId(newActive.id);
        setActiveFile(newActive.id);
        if (editorRef.current && modelRefs.current[newActive.id]) {
          editorRef.current.setModel(modelRefs.current[newActive.id]);
        }
      } else {
        setActiveTabId(null);
        setActiveFile(null);
        if (editorRef.current) {
          editorRef.current.setModel(null);
        }
      }
    }
  }, [openFiles, activeTabId, setActiveFile]);

  const handleTabDoubleClick = useCallback((fileId) => {
    // Could trigger rename or save
    markFileSaved(fileId);
  }, [markFileSaved]);

  const handleNewFile = useCallback(() => {
    const newFile = createFile('untitled.txt');
    if (newFile) {
      setActiveTabId(newFile.id);
      setActiveFile(newFile.id);
    }
  }, [createFile, setActiveFile]);

  const handleSave = useCallback(() => {
    if (activeFile) {
      markFileSaved(activeFile.id);
    }
  }, [activeFile, markFileSaved]);

  const handleRun = useCallback(() => {
    if (activeFile && onRunCode) {
      onRunCode(activeFile.content, activeFile.language);
    }
  }, [activeFile, onRunCode]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + S - Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      // Ctrl/Cmd + W - Close tab
      if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
        e.preventDefault();
        if (activeTabId) handleTabClose(activeTabId);
      }
      // Ctrl/Cmd + N - New file
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        handleNewFile();
      }
      // Ctrl/Cmd + Tab - Next tab
      if ((e.ctrlKey || e.metaKey) && e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        const currentIndex = openFiles.findIndex((f) => f.id === activeTabId);
        if (currentIndex !== -1 && currentIndex < openFiles.length - 1) {
          handleTabClick(openFiles[currentIndex + 1].id);
        }
      }
      // Ctrl/Cmd + Shift + Tab - Previous tab
      if ((e.ctrlKey || e.metaKey) && e.key === 'Tab' && e.shiftKey) {
        e.preventDefault();
        const currentIndex = openFiles.findIndex((f) => f.id === activeTabId);
        if (currentIndex > 0) {
          handleTabClick(openFiles[currentIndex - 1].id);
        }
      }
      // Ctrl/Cmd + Enter - Run
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleRun();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeTabId, openFiles, handleSave, handleTabClose, handleNewFile, handleTabClick, handleRun]);

  if (!editorMounted) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50/50 dark:bg-gray-900/40 border border-gray-200 dark:border-green-500/10 rounded-xl hacker-glass">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <div className="animate-spin text-3xl mb-2">⚡</div>
          <p>Loading editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-green-500/10 overflow-hidden hacker-glass">
      {/* Tab Bar */}
      <TabBar
        tabs={openFiles}
        activeTabId={activeTabId}
        onTabClick={handleTabClick}
        onTabClose={handleTabClose}
        onTabDoubleClick={handleTabDoubleClick}
      />

      {/* Editor Area */}
      <div className="flex-1 relative min-h-0">
        {activeFile ? (
          <LazyMonacoEditor
            language={activeFile.language}
            value={activeFile.content || ''}
            onChange={handleEditorChange}
            onMount={handleEditorMount}
            theme={theme}
            height="100%"
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
              automaticLayout: true,
            }}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50/50 dark:bg-gray-900/40">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <FaFileCode className="text-4xl mb-2 opacity-30" />
              <p className="text-lg">No file open</p>
              <p className="text-sm mt-1">Create or select a file from the explorer</p>
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50/50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-green-500/10 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-3">
          {activeFile && (
            <>
              <span className="font-mono">{activeFile.language}</span>
              <span>Ln 1, Col 1</span>
              {activeFile.isDirty && <span className="text-yellow-400">● Unsaved</span>}
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={!activeFile || !activeFile.isDirty}
            className="px-2 py-1 text-gray-500 hover:text-green-400 disabled:opacity-40 transition-colors"
            title="Save (Ctrl+S)"
          >
            <FaSave className="text-xs mr-1" /> Save
          </button>
          {onRunCode && (
            <button
              onClick={handleRun}
              disabled={!activeFile}
              className="px-2 py-1 text-gray-500 hover:text-blue-400 disabled:opacity-40 transition-colors"
              title="Run (Ctrl+Enter)"
            >
              <FaPlay className="text-xs mr-1" /> Run
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TabbedEditor;