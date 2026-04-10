import React from "react";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            <span>© {currentYear} <span className="font-semibold text-gray-900 dark:text-gray-200">CodeBuddi</span></span>
            <span className="hidden sm:inline text-gray-400">|</span>
            <span className="hidden sm:inline">Powered by AI</span>
          </p>
          
          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
            <span>HTML</span>
            <span className="w-1 h-1 bg-gray-400 rounded-full" />
            <span>CSS</span>
            <span className="w-1 h-1 bg-gray-400 rounded-full" />
            <span>JavaScript</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

