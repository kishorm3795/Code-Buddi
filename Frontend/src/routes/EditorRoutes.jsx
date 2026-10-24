import React, { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import { IoLogoPython, IoHardwareChipOutline } from "react-icons/io5";
import {
  SiJavascript,
  SiRust,
  SiMongodb,
  SiSwift,
  SiRuby,
  SiDart,
  SiPerl,
  SiScala,
  SiJulia,
} from "react-icons/si";
import { FaGolang, FaSpinner } from "react-icons/fa6";
import { RiJavaFill } from "react-icons/ri";
import {
  PiFileCppFill,
  PiFileCSharpFill,
  PiFileCFill,
  PiFileSqlFill,
} from "react-icons/pi";
import { TbBrandKotlin } from "react-icons/tb";
import { BiLogoTypescript } from "react-icons/bi";
import { ProtectedRoute, PublicOnlyRoute } from "../components/ProtectedRoute";
import { GENAI_API_URL } from "../utils/constants";

// Lazy-loaded route components
const Register = lazy(() => import("../pages/Register"));
const Login = lazy(() => import("../pages/Login"));
const ForgotPassword = lazy(() => import("../pages/ForgotPassword"));
const Accounts = lazy(() => import("../pages/Accounts"));
const NotFound = lazy(() => import("../pages/NotFound"));
const NavigationLinks = lazy(() => import("../components/NavigationLinks"));
const Editor = lazy(() => import("../components/Editor"));
const CodeEditor = lazy(() => import("../components/CodeEditor"));
const ShareEditor = lazy(() => import("../components/ShareEditor"));

const RouteLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[60vh] text-gray-500 dark:text-gray-400">
    <FaSpinner className="animate-spin text-2xl mr-2 text-green-500" />
    <span className="font-mono text-sm">Loading view...</span>
  </div>
);

const languages = [
  {
    path: "/python",
    language: "python",
    icon: IoLogoPython,
  },
  {
    path: "/javascript",
    language: "javascript",
    icon: SiJavascript,
  },
  {
    path: "/c",
    language: "c",
    icon: PiFileCFill,
  },
  {
    path: "/cpp",
    language: "cpp",
    icon: PiFileCppFill,
  },
  {
    path: "/java",
    language: "java",
    icon: RiJavaFill,
  },
  {
    path: "/csharp",
    language: "csharp",
    icon: PiFileCSharpFill,
  },
  {
    path: "/rust",
    language: "rust",
    icon: SiRust,
  },
  {
    path: "/go",
    language: "go",
    icon: FaGolang,
  },
  {
    path: "/verilog",
    language: "verilog",
    icon: IoHardwareChipOutline,
  },
  {
    path: "/sql",
    language: "sql",
    icon: PiFileSqlFill,
  },
  {
    path: "/mongodb",
    language: "mongodb",
    icon: SiMongodb,
  },
  {
    path: "/swift",
    language: "swift",
    icon: SiSwift,
  },
  {
    path: "/ruby",
    language: "ruby",
    icon: SiRuby,
  },
  {
    path: "/typescript",
    language: "typescript",
    icon: BiLogoTypescript,
  },
  {
    path: "/dart",
    language: "dart",
    icon: SiDart,
  },
  {
    path: "/kotlin",
    language: "kotlin",
    icon: TbBrandKotlin,
  },
  {
    path: "/perl",
    language: "perl",
    icon: SiPerl,
  },
  {
    path: "/scala",
    language: "scala",
    icon: SiScala,
  },
  {
    path: "/julia",
    language: "julia",
    icon: SiJulia,
  },
];

const EditorRoutes = ({ isDarkMode }) => (
  <div className="flex-grow">
    <Suspense fallback={<RouteLoadingFallback />}>
      <Routes>
        <Route
          path="/register"
          element={<PublicOnlyRoute element={<Register isDarkMode={isDarkMode} />} />}
        />

        <Route path="/login" element={<PublicOnlyRoute element={<Login />} />} />

        <Route path="/forgot-password" element={<ForgotPassword />} />

        <Route
          path="/account/:username"
          element={<ProtectedRoute element={<Accounts />} />}
        />
        <Route
          path="/account"
          element={<ProtectedRoute element={<Accounts />} />}
        />

        <Route path="/" element={<NavigationLinks />} />

        <Route
          path="/htmlcssjs"
          element={<Editor isDarkMode={isDarkMode} />}
        />

        <Route
          path="/:shareId"
          element={<ShareEditor isDarkMode={isDarkMode} />}
        />

        {languages.map(({ path, language, icon }) => (
          <Route
            key={language}
            path={path}
            element={
              <CodeEditor
                language={language}
                reactIcon={icon}
                apiEndpoint={`${GENAI_API_URL}/get-output`}
                isDarkMode={isDarkMode}
              />
            }
          />
        ))}

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  </div>
);

export default EditorRoutes;
