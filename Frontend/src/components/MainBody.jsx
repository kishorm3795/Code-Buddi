import React from "react";
import Header from "./Header";
import Footer from "./Footer";
import EditorRoutes from "../routes/EditorRoutes";

const MainBody = ({ isDarkMode, toggleTheme }) => {
  return (
    <div className="min-h-screen flex flex-col bg-[#f3f3f3] dark:bg-gray-900 dark:text-white select-none dark:[color-scheme:dark]">
      {/* Tron Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Animated Grid Background */}
        <div className="absolute inset-0 tron-grid-bg opacity-50" />
        
        {/* Holographic Particles */}
        <div className="absolute inset-0 tron-particles" />
        
        {/* Floating Orbs */}
        <div className="absolute top-20 left-10 w-96 h-96 tron-orb rounded-full blur-3xl opacity-20" />
        <div className="absolute bottom-20 right-10 w-80 h-80 tron-orb rounded-full blur-3xl opacity-15" 
             style={{ background: 'radial-gradient(circle, rgba(191, 0, 255, 0.3) 0%, transparent 70%)' }} />
        
        {/* Digital Rain Effect */}
        <div className="absolute inset-0 tron-digital-rain opacity-30" />
        
        {/* Background Lines */}
        <div className="absolute inset-0 tron-bg-lines" />
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

