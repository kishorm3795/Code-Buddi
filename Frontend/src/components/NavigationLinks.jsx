import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SharedLinks from "./SharedLinks";

const navLinks = [
  {
    to: "/htmlcssjs",
    text: "HTML, CSS, JS",
    icon: "🌐",
    classes: "from-blue-500 to-cyan-500",
    glowColor: "rgba(59, 130, 246, 0.5)",
  },
  {
    to: "/python",
    text: "Python",
    icon: "🐍",
    classes: "from-green-500 to-emerald-500",
    glowColor: "rgba(34, 197, 94, 0.5)",
  },
  {
    to: "/javascript",
    text: "Javascript",
    icon: "⚡",
    classes: "from-yellow-400 to-orange-500",
    glowColor: "rgba(234, 179, 8, 0.5)",
  },
  {
    to: "/c",
    text: "C",
    icon: "©",
    classes: "from-blue-600 to-blue-700",
    glowColor: "rgba(37, 99, 235, 0.5)",
  },
  {
    to: "/cpp",
    text: "C++",
    icon: "⚙️",
    classes: "from-blue-700 to-indigo-600",
    glowColor: "rgba(67, 56, 202, 0.5)",
  },
  {
    to: "/java",
    text: "Java",
    icon: "☕",
    classes: "from-orange-500 to-red-500",
    glowColor: "rgba(249, 115, 22, 0.5)",
  },
  {
    to: "/csharp",
    text: "C#",
    icon: "♯",
    classes: "from-purple-500 to-violet-600",
    glowColor: "rgba(168, 85, 247, 0.5)",
  },
  {
    to: "/rust",
    text: "Rust",
    icon: "🦀",
    classes: "from-orange-600 to-amber-600",
    glowColor: "rgba(217, 119, 6, 0.5)",
  },
  {
    to: "/go",
    text: "Go",
    icon: "🔵",
    classes: "from-cyan-500 to-teal-500",
    glowColor: "rgba(6, 182, 212, 0.5)",
  },
  {
    to: "/verilog",
    text: "Verilog",
    icon: "🔲",
    classes: "from-gray-500 to-gray-600",
    glowColor: "rgba(107, 114, 128, 0.5)",
  },
  {
    to: "/sql",
    text: "SQL",
    icon: "🗄️",
    classes: "from-blue-500 to-indigo-500",
    glowColor: "rgba(99, 102, 241, 0.5)",
  },
  {
    to: "/mongodb",
    text: "MongoDB",
    icon: "🍃",
    classes: "from-green-500 to-lime-500",
    glowColor: "rgba(132, 204, 22, 0.5)",
  },
  {
    to: "/swift",
    text: "Swift",
    icon: "🍎",
    classes: "from-orange-500 to-red-500",
    glowColor: "rgba(251, 146, 60, 0.5)",
  },
  {
    to: "/ruby",
    text: "Ruby",
    icon: "💎",
    classes: "from-red-500 to-rose-600",
    glowColor: "rgba(239, 68, 68, 0.5)",
  },
  {
    to: "/typescript",
    text: "Typescript",
    icon: "📘",
    classes: "from-blue-600 to-blue-500",
    glowColor: "rgba(37, 99, 235, 0.5)",
  },
  {
    to: "/dart",
    text: "Dart",
    icon: "🎯",
    classes: "from-cyan-400 to-blue-500",
    glowColor: "rgba(34, 211, 238, 0.5)",
  },
  {
    to: "/kotlin",
    text: "Kotlin",
    icon: "🟣",
    classes: "from-violet-500 to-purple-600",
    glowColor: "rgba(139, 92, 246, 0.5)",
  },
  {
    to: "/perl",
    text: "Perl",
    icon: "🐪",
    classes: "from-pink-500 to-rose-500",
    glowColor: "rgba(236, 72, 153, 0.5)",
  },
  {
    to: "/scala",
    text: "Scala",
    icon: "🎼",
    classes: "from-red-500 to-gray-500",
    glowColor: "rgba(239, 68, 68, 0.5)",
  },
  {
    to: "/julia",
    text: "Julia",
    icon: "🔮",
    classes: "from-purple-400 to-pink-500",
    glowColor: "rgba(192, 132, 252, 0.5)",
  },
];

const TronCard = ({ to, text, icon, classes, glowColor }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const baseUrl = window.location.origin;

  return (
    <Link
      to={`${baseUrl}${to}`}
      aria-label={`Navigate to ${text} Editor`}
      title={text}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        relative overflow-hidden rounded-xl p-6
        bg-gradient-to-br ${classes}
        transform transition-all duration-500
        hover:scale-105 hover:-translate-y-2
        shadow-lg hover:shadow-2xl
        group
        tron-card-advanced
      `}
      style={{
        "--glow-color": glowColor,
      }}
    >
      {/* Glow Effect on Hover */}
      <div
        className="absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300"
        style={{
          background: `radial-gradient(circle at ${mousePos.x}px ${mousePos.y}px, ${glowColor} 0%, transparent 50%)`,
          opacity: isHovered ? 1 : 0,
        }}
      />

      {/* Inner Content */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center">
        {/* Icon with Glow */}
        <div className="text-4xl mb-3 tron-icon-glow filter drop-shadow-lg">
          {icon}
        </div>

        {/* Text with Glitch Effect */}
        <span className="text-white font-bold text-lg tracking-wider font-mono tron-neon-border inline-block px-3 py-1 rounded">
          {text}
        </span>
      </div>

      {/* Corner Accents */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-white/50 rounded-tl-lg" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-white/50 rounded-tr-lg" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-white/50 rounded-bl-lg" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-white/50 rounded-br-lg" />

      {/* Scanline Effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
    </Link>
  );
};

const NavigationLinks = () => {
  useEffect(() => {
    document.title = "CodeBuddi - Online IDE";
  }, []);

  return (
    <>
      {/* Hero Section */}
      <div className="relative flex flex-col items-center justify-center min-h-[40vh] px-4 pt-16 pb-8">
        {/* Title with Glow */}
        <h1 
          className="text-5xl md:text-7xl font-bold mb-4 text-center tron-title-glow font-['Orbitron']"
          data-text="CodeBuddi"
        >
          <span className="tron-holographic">CodeBuddi</span>
        </h1>
        
        {/* Subtitle */}
        <p className="text-xl md:text-2xl text-gray-400 mb-8 font-['Rajdhani'] text-center max-w-2xl">
          <span className="text-cyan-400">Next-Generation</span> Online IDE with 
          <span className="text-purple-400"> AI-Powered</span> Code Generation
        </p>

        {/* Animated Tagline */}
        <div className="flex items-center gap-2 text-sm md:text-base text-gray-500 font-['JetBrains_Mono']">
          <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
          <span>Ready to code</span>
          <span className="animate-bounce">_</span>
        </div>

        {/* Decorative Line */}
        <div className="mt-8 flex items-center gap-4">
          <div className="h-px w-20 bg-gradient-to-r from-transparent to-cyan-500" />
          <div className="w-2 h-2 bg-cyan-400 rotate-45" />
          <div className="h-px w-20 bg-gradient-to-l from-transparent to-cyan-500" />
        </div>
      </div>

      {/* Language Cards Grid */}
      <div className="flex justify-center items-start p-4 pb-12">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6 max-w-7xl w-full">
          {navLinks.map(({ to, text, icon, classes, glowColor }) => (
            <TronCard
              key={to}
              to={to}
              text={text}
              icon={icon}
              classes={classes}
              glowColor={glowColor}
            />
          ))}
        </div>
      </div>

      {/* Shared Links Section */}
      <SharedLinks />

      {/* Footer Spacer */}
      <div className="h-8" />
    </>
  );
};

export default NavigationLinks;

