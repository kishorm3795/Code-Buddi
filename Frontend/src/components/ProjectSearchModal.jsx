import React, { useState, useEffect, useRef } from 'react';
import { FaSearch, FaFileCode, FaTimes } from 'react-icons/fa';
import { searchFileTree } from '../utils/fileSearch';

export default function ProjectSearchModal({ isOpen, onClose, files = [], onSelectFile }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  const searchResults = searchFileTree(files, query, { maxResults: 15 });

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < searchResults.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : Math.max(0, searchResults.length - 1)));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (searchResults[selectedIndex]) {
        onSelectFile(searchResults[selectedIndex]);
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Quick File Search"
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-slate-900/95 border border-cyan-500/40 rounded-xl shadow-[0_0_25px_rgba(0,240,255,0.2)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-cyan-500/20 bg-slate-950/60">
          <FaSearch className="text-cyan-400 mr-3 text-lg shrink-0" />
          <input
            ref={inputRef}
            type="text"
            role="searchbox"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search files by name or path... (Esc to close)"
            className="w-full bg-transparent text-white placeholder-slate-400 focus:outline-none text-sm"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="text-slate-400 hover:text-cyan-400 p-1 transition-colors"
          >
            <FaTimes />
          </button>
        </div>

        {/* Search Results List */}
        <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/50 p-1">
          {searchResults.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">
              No files found matching &quot;{query}&quot;
            </div>
          ) : (
            searchResults.map((file, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={file.id || file.computedPath || idx}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onSelectFile(file);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${
                    isSelected
                      ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-500/30'
                      : 'text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center min-w-0 mr-2">
                    <FaFileCode className="text-cyan-400 mr-2.5 shrink-0" />
                    <span className="font-medium truncate">{file.name}</span>
                  </div>
                  <span className="text-xs text-slate-400 truncate max-w-[200px]">
                    {file.computedPath || file.path || file.name}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 border-t border-cyan-500/10 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <span>Navigate: <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-cyan-300">↑</kbd> <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-cyan-300">↓</kbd></span>
          <span>Select: <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-cyan-300">Enter</kbd></span>
          <span>Close: <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-cyan-300">Esc</kbd></span>
        </div>
      </div>
    </div>
  );
}
