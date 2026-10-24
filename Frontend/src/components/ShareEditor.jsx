import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import CodeEditor from "./CodeEditor";
import Editor from "./Editor";
import LinkExpiredScreen from "./share/LinkExpiredScreen";
import LinkNotFoundScreen from "./share/LinkNotFoundScreen";
import { apiClient } from "../api/client";
import { useAuth } from "../hooks/useAuth";
import {
  SESSION_STORAGE_FETCH_STATUS_KEY,
  SESSION_STORAGE_SHARELINKS_KEY,
  TEMP_SHARE_API_URL,
  GENAI_API_URL,
  BACKEND_API_URL,
} from "../utils/constants";
import { FaSpinner, FaGolang } from "react-icons/fa6";
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
import { RiJavaFill } from "react-icons/ri";
import {
  PiFileCppFill,
  PiFileCSharpFill,
  PiFileCFill,
  PiFileSqlFill,
} from "react-icons/pi";
import { TbBrandKotlin } from "react-icons/tb";
import { BiLogoTypescript } from "react-icons/bi";
import { FiClipboard } from "react-icons/fi";
import { MdDone } from "react-icons/md";

const languageIcons = {
  python: IoLogoPython,
  javascript: SiJavascript,
  rust: SiRust,
  mongodb: SiMongodb,
  swift: SiSwift,
  ruby: SiRuby,
  dart: SiDart,
  perl: SiPerl,
  scala: SiScala,
  julia: SiJulia,
  go: FaGolang,
  java: RiJavaFill,
  cpp: PiFileCppFill,
  csharp: PiFileCSharpFill,
  c: PiFileCFill,
  sql: PiFileSqlFill,
  verilog: IoHardwareChipOutline,
  typescript: BiLogoTypescript,
  kotlin: TbBrandKotlin,
};

const isUUIDMatch = (inputString) => {
  const regex =
    /(c|cpp|csharp|dart|go|htmlcssjs|java|javascript|julia|kotlin|mongodb|perl|python|ruby|rust|scala|sql|swift|typescript|verilog)-([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/;
  return regex.test(inputString);
};

const ShareEditor = ({ isDarkMode }) => {
  const { shareId } = useParams();
  const [copiedLink, setCopiedLink] = useState(false);
  const [state, setState] = useState({
    code: "",
    language: "",
    expiryTime: null,
    title: "",
    isNotFound: false,
    isExpired: false,
    loading: true,
  });

  const copyBtnTimeout = useRef(null);

  const { code, language, expiryTime, title, isNotFound, isExpired, loading } = state;

  const icon = languageIcons[language] || null;

  const formattedTitle = title
    ? `${title.charAt(0).toUpperCase()}${
        title.length > 30
          ? title.slice(1, 30) + "..." + title.slice(-3)
          : title.slice(1)
      }`
    : "";

  const formattedExpiryTime = expiryTime
    ? new Date(expiryTime).toLocaleString()
    : "";

  const { token, isLoggedIn } = useAuth();

  const deleteSharedLink = useCallback(async (idToDelete) => {
    if (!token && !isLoggedIn) {
      return;
    }
    try {
      const linkResponse = await apiClient(`${BACKEND_API_URL}/api/sharedLink`, {
        method: "DELETE",
        body: JSON.stringify({ shareId: idToDelete }),
      });

      if (linkResponse.ok) {
        sessionStorage.removeItem(SESSION_STORAGE_SHARELINKS_KEY);
      }
    } catch (err) {
      console.warn("Could not delete expired shared link:", err);
    }
  }, [token, isLoggedIn]);

  const fetchCode = useCallback(async () => {
    if (!shareId || !isUUIDMatch(shareId)) {
      setState((prev) => ({
        ...prev,
        isNotFound: true,
        isExpired: false,
        loading: false,
      }));
      return;
    }

    const fetchStatus = sessionStorage.getItem(
      SESSION_STORAGE_FETCH_STATUS_KEY
    );

    if (fetchStatus === "true") {
      const cachedData = sessionStorage.getItem(shareId);

      if (cachedData) {
        try {
          const { code: cachedCode, language: cachedLang, expiry_time, title: cachedTitle } =
            JSON.parse(cachedData);

          setState({
            code: cachedCode,
            language: cachedLang,
            expiryTime: expiry_time,
            title: cachedTitle,
            isNotFound: false,
            isExpired: false,
            loading: false,
          });
          return;
        } catch {
          // parse failed, continue fetch
        }
      }
    }

    try {
      setState((prev) => ({ ...prev, loading: true }));
      const response = await apiClient(`${TEMP_SHARE_API_URL}/file/${shareId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-File-ID": `${shareId}`,
        },
      });

      if (response.status === 410) {
        setState({
          code: "",
          language: "",
          expiryTime: null,
          title: "",
          isNotFound: false,
          isExpired: true,
          loading: false,
        });
        deleteSharedLink(shareId);
        sessionStorage.setItem(SESSION_STORAGE_FETCH_STATUS_KEY, "false");
        return;
      }

      if (response.status === 404) {
        setState({
          code: "",
          language: "",
          expiryTime: null,
          title: "",
          isNotFound: true,
          isExpired: false,
          loading: false,
        });
        deleteSharedLink(shareId);
        sessionStorage.setItem(SESSION_STORAGE_FETCH_STATUS_KEY, "false");
        return;
      }

      if (response.ok) {
        const data = await response.json();

        if (data.error === "File has expired") {
          setState({
            code: "",
            language: "",
            expiryTime: null,
            title: "",
            isNotFound: false,
            isExpired: true,
            loading: false,
          });
          deleteSharedLink(shareId);
        } else if (data.error === "File not found" || data.error) {
          setState({
            code: "",
            language: "",
            expiryTime: null,
            title: "",
            isNotFound: true,
            isExpired: false,
            loading: false,
          });
          deleteSharedLink(shareId);
        } else {
          setState({
            code: data.code,
            language: data.language,
            expiryTime: data.expiry_time,
            title: data.title,
            isNotFound: false,
            isExpired: false,
            loading: false,
          });

          sessionStorage.setItem(
            shareId,
            JSON.stringify({
              code: data.code,
              language: data.language,
              expiry_time: data.expiry_time,
              title: data.title,
            })
          );
          sessionStorage.setItem(SESSION_STORAGE_FETCH_STATUS_KEY, "true");
        }
      } else {
        setState({
          code: "",
          language: "",
          expiryTime: null,
          title: "",
          isNotFound: true,
          isExpired: false,
          loading: false,
        });
        deleteSharedLink(shareId);
        sessionStorage.setItem(SESSION_STORAGE_FETCH_STATUS_KEY, "false");
      }
    } catch {
      setState({
        code: "",
        language: "",
        expiryTime: null,
        title: "",
        isNotFound: true,
        isExpired: false,
        loading: false,
      });
      deleteSharedLink(shareId);
      sessionStorage.setItem(SESSION_STORAGE_FETCH_STATUS_KEY, "false");
    }
  }, [shareId, deleteSharedLink]);

  useEffect(() => {
    fetchCode();
  }, [fetchCode]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);

    if (copyBtnTimeout.current) {
      clearTimeout(copyBtnTimeout.current);
    }

    setCopiedLink(true);

    copyBtnTimeout.current = setTimeout(() => {
      setCopiedLink(false);
    }, 1500);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh] px-2 bg-gray-100 dark:bg-gray-900">
        <div className="flex items-center text-lg text-gray-500 font-medium">
          <span>Loading</span>
          <FaSpinner className="ml-2 animate-spin" />
        </div>
      </div>
    );
  }

  if (isExpired) {
    return <LinkExpiredScreen />;
  }

  if (isNotFound) {
    return <LinkNotFoundScreen />;
  }

  return (
    <div>
      {expiryTime && title && (
        <div className="ml-5 text-sm text-gray-500 select-text font-medium pt-3 flex flex-col sm:flex-row sm:items-center sm:justify-start">
          <div className="mb-2 sm:mb-0">
            <span className="mr-2">Title:</span>
            <span title={title}>{formattedTitle}</span>
          </div>
          <div className="flex items-center">
            <span className="mr-2 sm:ml-4">Expires on:</span>
            <span>{formattedExpiryTime}</span>
          </div>
          <div className="mt-2 select-none items-center sm:mt-0 sm:ml-4">
            <button
              type="button"
              onClick={handleCopyLink}
              title="Click to copy the link"
              className="flex cursor-pointer hover:text-gray-400"
            >
              {copiedLink ? (
                <MdDone className="mr-1 mt-1 text-green-500" />
              ) : (
                <FiClipboard className="mr-1 mt-1" />
              )}
              {copiedLink ? "Link Copied!" : "Copy Link"}
            </button>
          </div>
        </div>
      )}

      {language === "htmlcssjs" ? (
        <Editor
          shareIdData={shareId}
          title={title}
          value={code}
          isDarkMode={isDarkMode}
        />
      ) : (
        <CodeEditor
          shareIdData={shareId}
          title={title}
          language={language}
          reactIcon={icon}
          apiEndpoint={`${GENAI_API_URL}/get-output`}
          isDarkMode={isDarkMode}
          defaultCode={code}
        />
      )}
    </div>
  );
};

export default ShareEditor;
