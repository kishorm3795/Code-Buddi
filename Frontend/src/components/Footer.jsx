import React from "react";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="text-center p-4 bg-gray-900 dark:bg-gray-950 text-white border-t border-[#00f0ff]/20">
      <p className="text-sm md:text-base lg:text-lg flex items-center justify-center font-mono">
        <span className="text-[#00f0ff] mr-2">◆</span>
        <span>&copy; {currentYear} <span className="text-[#00f0ff] font-semibold tron-text-gradient">CodeBuddi</span></span>
        <span className="mx-2 text-gray-500">|</span>
        <span className="text-gray-400">Powered by AI</span>
        <span className="text-[#00f0ff] ml-2">◆</span>
      </p>
      <div className="mt-2 flex justify-center items-center space-x-4 text-xs text-gray-500 font-mono">
        <span>HTML</span>
        <span className="text-[#00f0ff]">●</span>
        <span>CSS</span>
        <span className="text-[#00f0ff]">●</span>
        <span>JavaScript</span>
      </div>
    </footer>
  );
};

export default Footer;

