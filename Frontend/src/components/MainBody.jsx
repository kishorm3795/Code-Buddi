import React from "react";
import Header from "./Header";
import Footer from "./Footer";
import EditorRoutes from "../routes/EditorRoutes";

const MainBody = ({ isDarkMode, toggleTheme }) => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white select-none">
      {/* Subtle Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Gradient Orbs */}
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-cyan-500/5 dark:bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/5 dark:bg-purple-500/10 rounded-full blur-3xl" />
        
        {/* Subtle Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,240,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,240,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />
      </div>
      
      {/* Content Layer */}
      <div className="relative z-10">
        <Header isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
        <EditorRoutes isDarkMode={isDarkMode} />
        <Footer />
      </div>
    </div>
  );
};

export default MainBody;

