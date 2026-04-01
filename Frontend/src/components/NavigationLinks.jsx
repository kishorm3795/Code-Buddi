import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SharedLinks from "./SharedLinks";
import {
  SiPython, SiJavascript, SiCplusplus, SiRust,
  SiGo, SiMongodb, SiSwift, SiRuby, SiTypescript,
  SiDart, SiKotlin, SiScala, SiJulia, SiPostgresql, SiPerl
} from "react-icons/si";
import { FaHtml5, FaCss3Alt, FaC, FaJava } from "react-icons/fa6";
import { TbBinaryTree, TbBrandCSharp } from "react-icons/tb";

const navLinks = [
  {
    to: "/htmlcssjs",
    text: "HTML, CSS, JS",
    icon: <div className="flex space-x-1"><FaHtml5 /><FaCss3Alt /><SiJavascript /></div>,
    classes: "from-blue-500 to-cyan-500",
    glowColor: "rgba(59, 130, 246, 0.5)",
  },
  {
    to: "/python",
    text: "Python",
    icon: <SiPython />,
    classes: "from-green-500 to-emerald-500",
    glowColor: "rgba(34, 197, 94, 0.5)",
  },
  {
    to: "/javascript",
    text: "Javascript",
    icon: <SiJavascript />,
    classes: "from-yellow-400 to-orange-500",
    glowColor: "rgba(234, 179, 8, 0.5)",
  },
  {
    to: "/c",
    text: "C",
    icon: <FaC />,
    classes: "from-blue-600 to-blue-700",
    glowColor: "rgba(37, 99, 235, 0.5)",
  },
  {
    to: "/cpp",
    text: "C++",
    icon: <SiCplusplus />,
    classes: "from-blue-700 to-indigo-600",
    glowColor: "rgba(67, 56, 202, 0.5)",
  },
  {
    to: "/java",
    text: "Java",
    icon: <FaJava />,
    classes: "from-orange-500 to-red-500",
    glowColor: "rgba(249, 115, 22, 0.5)",
  },
  {
    to: "/csharp",
    text: "C#",
    icon: <TbBrandCSharp />,
    classes: "from-purple-500 to-violet-600",
    glowColor: "rgba(168, 85, 247, 0.5)",
  },
  {
    to: "/rust",
    text: "Rust",
    icon: <SiRust />,
    classes: "from-orange-600 to-amber-600",
    glowColor: "rgba(217, 119, 6, 0.5)",
  },
  {
    to: "/go",
    text: "Go",
    icon: <SiGo />,
    classes: "from-cyan-500 to-teal-500",
    glowColor: "rgba(6, 182, 212, 0.5)",
  },
  {
    to: "/verilog",
    text: "Verilog",
    icon: <TbBinaryTree />,
    classes: "from-gray-500 to-gray-600",
    glowColor: "rgba(107, 114, 128, 0.5)",
  },
  {
    to: "/sql",
    text: "SQL",
    icon: <SiPostgresql />,
    classes: "from-blue-500 to-indigo-500",
    glowColor: "rgba(99, 102, 241, 0.5)",
  },
  {
    to: "/mongodb",
    text: "MongoDB",
    icon: <SiMongodb />,
    classes: "from-green-500 to-lime-500",
    glowColor: "rgba(132, 204, 22, 0.5)",
  },
  {
    to: "/swift",
    text: "Swift",
    icon: <SiSwift />,
    classes: "from-orange-500 to-red-500",
    glowColor: "rgba(251, 146, 60, 0.5)",
  },
  {
    to: "/ruby",
    text: "Ruby",
    icon: <SiRuby />,
    classes: "from-red-500 to-rose-600",
    glowColor: "rgba(239, 68, 68, 0.5)",
  },
  {
    to: "/typescript",
    text: "Typescript",
    icon: <SiTypescript />,
    classes: "from-blue-600 to-blue-500",
    glowColor: "rgba(37, 99, 235, 0.5)",
  },
  {
    to: "/dart",
    text: "Dart",
    icon: <SiDart />,
    classes: "from-cyan-400 to-blue-500",
    glowColor: "rgba(34, 211, 238, 0.5)",
  },
  {
    to: "/kotlin",
    text: "Kotlin",
    icon: <SiKotlin />,
    classes: "from-violet-500 to-purple-600",
    glowColor: "rgba(139, 92, 246, 0.5)",
  },
  {
    to: "/perl",
    text: "Perl",
    icon: <SiPerl />,
    classes: "from-pink-500 to-rose-500",
    glowColor: "rgba(236, 72, 153, 0.5)",
  },
  {
    to: "/scala",
    text: "Scala",
    icon: <SiScala />,
    classes: "from-red-500 to-gray-500",
    glowColor: "rgba(239, 68, 68, 0.5)",
  },
  {
    to: "/julia",
    text: "Julia",
    icon: <SiJulia />,
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
        relative overflow-hidden rounded-xl p-5
        bg-gradient-to-br ${classes}
        transform transition-all duration-300
        hover:scale-105 hover:-translate-y-1
        shadow-lg hover:shadow-xl
        group tron-card-advanced
      `}
      style={{
        "--glow-color": glowColor,
      }}
    >
      {/* Glow Effect on Hover */}
      <div
        className="absolute inset-0 opacity-0 transition-opacity duration-300"
        style={{
          background: `radial-gradient(circle at ${mousePos.x}px ${mousePos.y}px, ${glowColor} 0%, transparent 50%)`,
          opacity: isHovered ? 1 : 0,
        }}
      />

      {/* Inner Content */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center">
        {/* Icon */}
        <div className="text-4xl mb-2 transition-transform duration-300 group-hover:scale-110">
          {icon}
        </div>

        {/* Text */}
        <span className="text-white font-semibold text-sm tracking-wide">
          {text}
        </span>
      </div>
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
      <div className="relative flex flex-col items-center justify-center min-h-[40vh] px-4 pt-20 pb-12 tron-particles tron-bg-lines overflow-hidden">
        {/* Animated Background Grids */}
        <div className="absolute inset-0 tron-grid-bg opacity-30"></div>
        <div className="absolute inset-0 tron-digital-rain opacity-10"></div>

        {/* Title */}
        <h1 className="text-5xl md:text-6xl lg:text-8xl font-black mb-6 text-center z-10">
          <span className="tron-holographic tron-title-glow tracking-tighter">
            CodeBuddi
          </span>
        </h1>
        
        {/* Subtitle */}
        <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-6 text-center max-w-2xl">
          Next-Generation Online IDE with{' '}
          <span className="text-cyan-500 font-medium">AI-Powered</span> Code Generation
        </p>

        {/* Features Pills */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {['20+ Languages', 'AI Code Gen', 'Real-time Preview', 'Share & Collaborate'].map((feature, idx) => (
            <span 
              key={idx}
              className="px-3 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-full"
            >
              {feature}
            </span>
          ))}
        </div>

        {/* CTA Indicator */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span>Select a language to start coding</span>
        </div>
      </div>

      {/* Language Cards Grid */}
      <div className="flex justify-center items-start p-4 pb-12">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4 max-w-7xl w-full">
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

