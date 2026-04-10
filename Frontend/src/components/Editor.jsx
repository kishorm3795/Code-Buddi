import React, { useState, useEffect, useCallback, useRef } from "react";
import { debounce } from "lodash";
import MonacoEditor from "@monaco-editor/react";
import ShareLinkModal from "../utils/ShareLinkModal.js";
import {
  SESSION_STORAGE_SHARELINKS_KEY,
  LOCAL_STORAGE_TOKEN_KEY,
  GENAI_API_URL,
  TEMP_SHARE_API_URL,
  BACKEND_API_URL,
  MAX_SIZE,
} from "../utils/constants";
import { apiFetch } from "../utils/apifetch";
import blocker from "../utils/blocker.js";
import { useNavigate } from "react-router-dom";

import { BiTerminal } from "react-icons/bi";
import { MdPreview } from "react-icons/md";
import { IoMdRefreshCircle } from "react-icons/io";
import { SlSizeFullscreen } from "react-icons/sl";
import { FaSpinner, FaDownload, FaWrench } from "react-icons/fa6";
import { FaMagic, FaTrashAlt, FaShare } from "react-icons/fa";
import Swal from "sweetalert2/dist/sweetalert2.js";

const EditorSection = ({
  language,
  value,
  onChange,
  theme,
  fontSize,
  readOnly,
  editorDidMount,
}) => {
  const getLanguageIcon = () => {
    switch (language) {
      case "html":
        return BiTerminal;
      case "css":
        return BiTerminal;
      case "javascript":
        return BiTerminal;
      default:
        return null;
    }
  };

  const capFirst = (str) => {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const getGradient = () => {
    switch (language) {
      case "html":
        return "from-orange-500 to-red-500";
      case "css":
        return "from-blue-500 to-green-500";
      case "javascript":
        return "from-yellow-400 to-amber-500";
      default:
        return "from-gray-500 to-gray-600";
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800/50 backdrop-blur-md rounded-xl shadow-lg border border-gray-200 dark:border-green-500/20 overflow-hidden hacker-glass">
      {/* Section Header */}
      <div className="flex items-center px-4 py-3 bg-gray-50/50 dark:bg-gray-800/30 border-b border-gray-200 dark:border-green-500/10">
        <div className={`p-2 bg-gradient-to-br ${getGradient()} rounded-lg mr-3 shadow-lg`}>
          {React.createElement(getLanguageIcon(), { className: "text-lg text-white" })}
        </div>
        <h2 className="text-base font-bold text-gray-700 dark:text-green-400 tracking-wider">
          {capFirst(language)}
        </h2>
      </div>
      <MonacoEditor
        language={language}
        value={value}
        onMount={editorDidMount(language)}
        onChange={(newValue) => onChange(language, newValue)}
        editorDidMount={(editor) => editor.focus()}
        loading={`Loading ${capFirst(language)} Editor...`}
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
        }}
        height="300px"
        theme={theme}
      />
    </div>
  );
};

const Editor = ({ isDarkMode, value, title, shareIdData }) => {
  const storageKey = `__${shareIdData || "htmlcssjs"}Code__`;

  const [code, setCode] = useState(() => {
    const savedCode = sessionStorage.getItem(storageKey);
    return savedCode
      ? JSON.parse(savedCode)
      : {
          html: value.html || "",
          css: value.css || "",
          javascript: value.javascript || "",
        };
  });

  const [deviceType, setDeviceType] = useState("pc");
  const [loadingAction, setLoadingAction] = useState(null);
  const [generateBtnTxt, generatesetBtnTxt] = useState("Generate");
  const [refactorBtnTxt, refactorsetBtnTxt] = useState("Refactor");
  const [isGenerateBtnPressed, setisGenerateBtnPressed] = useState(false);
  const [isRefactorBtnPressed, setisRefactorBtnPressed] = useState(false);
  const [isPreviewEnabled, setIsPreviewEnabled] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isEditorReadOnly, setIsEditorReadOnly] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOverlayVisible, setIsOverlayVisible] = useState(false);
  const [overlayText, setOverlayText] = useState(false);

  const iframeRef = useRef(null);
  const editorRefs = useRef({});

  const fontSizeMap = {
    pc: 16,
    tablet: 14,
    mobile: 12,
  };

  const languages = ["html", "css", "javascript"];

  const capFirst = (str) => {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  useEffect(() => {
    const formattedTitle = title
      ? title.length > 30
        ? `${title.slice(0, 30)}...${title.slice(-3)}`
        : title
      : "";

    document.title = formattedTitle
      ? `${capFirst(formattedTitle)} - CodeBuddi Editor`
      : "CodeBuddi - HTML, CSS, JS Editor";
  }, [title]);

  const navigate = useNavigate();

  useEffect(() => {
    const storedCode = JSON.stringify(code);
    sessionStorage.setItem(storageKey, storedCode);

    const token = localStorage.getItem(LOCAL_STORAGE_TOKEN_KEY);
    if (token) {
      setIsLoggedIn(true);
    }
  }, [code]);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width > 1024) {
        setDeviceType("pc");
      } else if (width <= 1024 && width > 768) {
        setDeviceType("tablet");
      } else {
        setDeviceType("mobile");
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const editorCode = JSON.parse(sessionStorage.getItem(storageKey));
    const { html, css, javascript } = editorCode;

    if (
      html.trim().length === 0 &&
      css.trim().length === 0 &&
      javascript.trim().length === 0
    ) {
      setCode({
        html: value.html || "",
        css: value.css || "",
        javascript: value.javascript || "",
      });
    }
  }, []);

  const editorDidMount = (id) => (editor, monaco) => {
    editorRefs.current[id] = editor;
  };

  const updatePreview = useCallback(
    debounce(() => {
      if (!isPreviewEnabled) return;

      try {
        const { html, css, javascript } = code;

        if (iframeRef.current) {
          const iframeDocument =
            iframeRef.current.contentDocument ||
            iframeRef.current.contentWindow.document;

          iframeDocument.open();
          iframeDocument.write(`
        <!DOCTYPE html>
        <html style="scrollbar-width: thin;">
          <head>
            <style>${css.trim() || ""}</style>
            <script>${blocker || ""}</script>
          </head>
          <body>
            ${html.trim() || ""}
            <script>
              (function() {
                try {
                  ${javascript.trim() || ""}
                } catch (error) {
                  console.error("Error executing JS:", error);
                }
              })();
            </script>
          </body>
        </html>
      `);
          iframeDocument.close();
        }
      } catch {}
    }, 500),
    [code, isPreviewEnabled]
  );

  const openPreviewFullScreen = () => {
    try {
      const { html, css, javascript } = code;
      const newWindow = window.open("", "_blank");
      newWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Preview</title>
        <style>${css.trim() || ""}</style>
        <script>${blocker || ""}</script>
      </head>
      <body>
        ${html.trim() || ""}
        <script>
          (function() {
            try {
              ${javascript.trim() || ""}
            } catch (error) {
              console.error("Error executing JS:", error);
            }
          })();
        </script>
      </body>
      </html>
    `);
      newWindow.document.close();
    } catch {}
  };

  const handleRefresh = () => {
    let refreshTimeout;

    if (refreshTimeout) {
      clearTimeout(refreshTimeout);
    }

    setIsRefreshing(true);
    updatePreview();

    refreshTimeout = setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  useEffect(() => {
    updatePreview();
  }, [code, updatePreview]);

  const handleEditorChange = (language, value) => {
    setCode((prevCode) => ({ ...prevCode, [language]: value }));
  };

  const clearAll = () => {
    setCode({ html: "", css: "", javascript: "" });
    sessionStorage.removeItem(storageKey);

    const { html, css, javascript } = code;

    if (iframeRef.current) {
      const iframeDocument =
        iframeRef.current.contentDocument ||
        iframeRef.current.contentWindow.document;

      setIsPreviewEnabled(false);

      iframeDocument.open();
      iframeDocument.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>${css || ""}</style>
          </head>
          <body>
            ${html || ""}
            <script>
              (function() {
                try {
                  ${javascript || ""}
                } catch (error) {
                  console.error("Error executing JS:", error);
                }
              })();
            </script>
          </body>
        </html>
      `);
      iframeDocument.close();

      setIsPreviewEnabled(true);
    }
  };

  const downloadFile = () => {
    const editorCode = JSON.parse(sessionStorage.getItem(storageKey));

    if (!editorCode) {
      return;
    }

    const { html, css, javascript } = editorCode;

    if (
      html.trim().length === 0 &&
      css.trim().length === 0 &&
      javascript.trim().length === 0
    )
      return;

    const cleanedHtml = html
      .replace(/<html.*?>|<\/html>/gi, "")
      .replace(/<head.*?>|<\/head>/gi, "")
      .replace(/<body.*?>|<\/body>/gi, "");

    const finalHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>${css || ""}</style>
        </head>
        <body>
          ${cleanedHtml || ""}
          <script>${javascript || ""}</script>
        </body>
      </html>
    `;

    const blob = new Blob([finalHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "file.html";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const scrollToLastLine = (editorId) => {
    const editor = editorRefs.current[editorId];
    if (editor) {
      const model = editor.getModel();
      if (model) {
        const lastLine = model.getLineCount();
        editor.revealLineInCenter(lastLine);
      }
    }
  };

  const handleCtrlS = (event) => {
    const editorCode = JSON.parse(sessionStorage.getItem(storageKey));

    if (!editorCode) {
      return;
    }

    const { html, css, javascript } = editorCode;

    if (
      (event.ctrlKey || event.metaKey) &&
      event.key === "s" &&
      !(
        html.trim().length === 0 &&
        css.trim().length === 0 &&
        javascript.trim().length === 0
      )
    ) {
      event.preventDefault();
      downloadFile();
    }
  };

  useEffect(() => {
    document.addEventListener("keydown", handleCtrlS);
    return () => {
      document.removeEventListener("keydown", handleCtrlS);
    };
  }, []);

  const generateCodeStream = async (type, data, onChunk) => {
    let result = "";

    try {
      const token = localStorage.getItem(LOCAL_STORAGE_TOKEN_KEY);
      if (!token) throw new Error("Token not found");

      const response = await apiFetch(
        `${GENAI_API_URL}/htmlcssjsgenerate-code`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok || !response.body) {
        throw new Error("Failed to generate code.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        result += chunk;
        if (typeof onChunk === "function") {
          onChunk(chunk);
        }
      }
    } catch (error) {
      Swal.fire("Error", "Failed to generate code.", "error");
    }

    return result;
  };

  const generateCodeMain = async () => {
    if (!isLoggedIn) {
      navigate("/login");
      return;
    }

    const { value: result } = await Swal.fire({
      title: "Generate Code",
      html: `
        <textarea id="swal-input1" class="swal2-textarea !w-[82%]" placeholder="e.g., simple calculator"></textarea>
        <label class="flex justify-center mt-3">
          <input type="checkbox" id="improvePrompt" class="mr-2">
          Improve Prompt
        </label>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Generate",
      preConfirm: () => {
        const prompt = document.getElementById("swal-input1").value.trim();
        const improve = document.getElementById("improvePrompt").checked;
        if (!prompt) {
          Swal.showValidationMessage(
            "This field is mandatory! Please enter a prompt."
          );
          return;
        }
        return { prompt, improve };
      },
      didOpen: () => {
        const modal = Swal.getPopup();
        const checkbox = modal.querySelector("#improvePrompt");
        const confirmBtn = modal.querySelector(".swal2-confirm");

        checkbox.addEventListener("change", () => {
          confirmBtn.textContent = checkbox.checked ? "Improve" : "Generate";
        });

        modal.addEventListener("keydown", (e) => {
          if (e.key === "Enter" && e.ctrlKey) {
            e.preventDefault();
            Swal.clickConfirm();
          }
        });
      },
      allowOutsideClick: false,
    });

    if (!result) return;

    let finalPrompt = result.prompt;

    if (result.improve) {
      Swal.fire({
        title: "Improving Prompt...",
        html: "Please wait while we generate new ideas.",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });
      try {
        const token = localStorage.getItem(LOCAL_STORAGE_TOKEN_KEY);
        if (!token) throw new Error("Token not found");

        const response = await apiFetch(`${GENAI_API_URL}/improve-prompt`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            topic: finalPrompt,
            language: "htmlcssjs",
          }),
        });

        const json = await response.json();

        if (!json.prompts || Object.keys(json.prompts).length === 0) {
          await Swal.fire(
            "Error",
            "Failed to generate improved prompts.",
            "error"
          );
          return;
        }

        const prompts = Object.values(json?.prompts);

        const selectedPrompt = await new Promise((resolve) => {
          const promptsHtml = prompts
            .map(
              (prompt, index) => `
              <div class="flex items-center justify-between border border-gray-200 p-[10px] rounded-md mb-[10px]">
                <p class="flex-grow select-text text-left m-0">${prompt}</p>
                <button 
                  class="swal2-confirm swal2-styled select-prompt-btn ml-[15px] py-[10px] px-[12px]" 
                  data-index="${index}" 
                  title="Select this prompt"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </button>
              </div>
            `
            )
            .join("");

          Swal.fire({
            title: "Select an Improved Prompt",
            html: `<div>${promptsHtml}</div>`,
            showConfirmButton: false,
            showCancelButton: true,
            allowOutsideClick: false,
            cancelButtonText: "Cancel",
            didOpen: () => {
              const promptButtons =
                document.querySelectorAll(".select-prompt-btn");
              promptButtons.forEach((button) => {
                button.addEventListener("click", () => {
                  const index = button.getAttribute("data-index");
                  if (index !== null) {
                    resolve(prompts[parseInt(index, 10)]);
                    Swal.close();
                  }
                });
              });
            },
          }).then((result) => {
            if (result.dismiss) {
              resolve(null);
            }
          });
        });

        if (!selectedPrompt) return;

        finalPrompt = selectedPrompt;
      } catch {
        await Swal.fire("Error", "Failed to improve prompt.", "error");
        return;
      }
    }

    setLoadingAction("generate");
    setIsOverlayVisible(true);
    generatesetBtnTxt("Generating...");
    setOverlayText("Generating HTML...");
    setisGenerateBtnPressed(true);
    setIsEditorReadOnly(true);

    try {
      let htmlCode = "",
        cssCode = "",
        jsCode = "";

      let isFirstChunk = true;

      htmlCode = await generateCodeStream(
        "html",
        { prompt: finalPrompt, type: "html" },
        (chunk) => {
          if (isFirstChunk) {
            setIsPreviewEnabled(false);
            setCode((prev) => ({ ...prev, html: "" }));
            isFirstChunk = false;
          }
          setCode((prev) => ({ ...prev, html: (prev.html || "") + chunk }));
          scrollToLastLine(languages[0]);
        }
      );

      setIsPreviewEnabled(true);

      isFirstChunk = true;
      setOverlayText("Generating CSS...");

      cssCode = await generateCodeStream(
        "css",
        { prompt: finalPrompt, htmlContent: htmlCode, type: "css" },
        (chunk) => {
          if (isFirstChunk) {
            setIsPreviewEnabled(false);
            setCode((prev) => ({ ...prev, css: "" }));
            isFirstChunk = false;
          }
          setCode((prev) => ({ ...prev, css: (prev.css || "") + chunk }));
          scrollToLastLine(languages[1]);
        }
      );

      setIsPreviewEnabled(true);

      isFirstChunk = true;
      setOverlayText("Generating JS...");

      jsCode = await generateCodeStream(
        "js",
        {
          prompt: finalPrompt,
          htmlContent: htmlCode,
          cssContent: cssCode,
          type: "js",
        },
        (chunk) => {
          if (isFirstChunk) {
            setIsPreviewEnabled(false);
            setCode((prev) => ({ ...prev, javascript: "" }));
            isFirstChunk = false;
          }
          setCode((prev) => ({
            ...prev,
            javascript: (prev.javascript || "") + chunk,
          }));
          scrollToLastLine(languages[2]);
        }
      );

      setIsPreviewEnabled(true);

      if (isLoggedIn) {
        await getGenerateCodeCount();
      }
    } catch {
      Swal.fire("Error", "Failed to generate code.", "error");
    } finally {
      generatesetBtnTxt("Generate");
      setisGenerateBtnPressed(false);
      setIsEditorReadOnly(false);
      setLoadingAction(null);
      setIsOverlayVisible(false);
      setOverlayText(null);
    }
  };

  const refactorCode = async () => {
    if (!isLoggedIn) {
      navigate("/login");
      return;
    }

    const storageData = JSON.parse(sessionStorage.getItem(storageKey)) || {};
    const { html: htmlCode, css: cssCode, javascript: jsCode } = storageData;

    if (htmlCode && htmlCode.trim().length > MAX_SIZE) {
      return Swal.fire({
        title: "Error",
        text: "The HTML code size exceeds the maximum allowed size of 500 KB.",
        icon: "error",
        confirmButtonText: "OK",
      });
    }

    if (cssCode && cssCode.trim().length > MAX_SIZE) {
      return Swal.fire({
        title: "Error",
        text: "The CSS code size exceeds the maximum allowed size of 500 KB.",
        icon: "error",
        confirmButtonText: "OK",
      });
    }

    if (jsCode && jsCode.trim().length > MAX_SIZE) {
      return Swal.fire({
        title: "Error",
        text: "The JavaScript code size exceeds the maximum allowed size of 500 KB.",
        icon: "error",
        confirmButtonText: "OK",
      });
    }

    const { value: formValues, isConfirmed } = await Swal.fire({
      title: "Refactor Code",
      html: `
      <div id="custom-html-wrapper">
        <div class="swal2-radio-group gap-x-[10px] flex text-left my-4 justify-center">
          <label><input type="checkbox" id="select-all" value="all"> All</label><br>
          <label><input type="checkbox" class="code-type" value="html"> HTML</label><br>
          <label><input type="checkbox" class="code-type" value="css"> CSS</label><br>
          <label><input type="checkbox" class="code-type" value="js"> JavaScript</label>
        </div>
        <textarea id="swal-input-textarea" class="swal2-textarea" placeholder="e.g., remove comments, optimize loop, etc."></textarea>
      </div>
    `,
      didOpen: () => {
        const container = document.getElementById("swal2-html-container");
        const customWrapper = document.getElementById("custom-html-wrapper");
        const inputTextarea = document.getElementById("swal-input-textarea");

        if (
          customWrapper &&
          container &&
          container.parentElement &&
          inputTextarea
        ) {
          container.parentElement.insertBefore(customWrapper, container);
          inputTextarea.focus();

          container.style.display = "none";
          inputTextarea.style.width = "-webkit-fill-available";
          inputTextarea.style.width = "-moz-available";
        }

        const modal = Swal.getPopup();
        modal.addEventListener("keydown", (e) => {
          if (e.key === "Enter" && e.ctrlKey) {
            e.preventDefault();
            Swal.clickConfirm();
          }
        });

        const checkboxes = document.querySelectorAll(".code-type");
        const selectAll = document.getElementById("select-all");
        const confirmButton = Swal.getConfirmButton();

        selectAll.checked = true;
        checkboxes.forEach((cb) => (cb.checked = true));

        const updateSelectAll = () => {
          const allChecked = Array.from(checkboxes).every((cb) => cb.checked);
          selectAll.checked = allChecked;
        };

        const validateCheckboxes = () => {
          const anyChecked = Array.from(checkboxes).some((cb) => cb.checked);
          confirmButton.disabled = !anyChecked;
          updateSelectAll();
        };

        validateCheckboxes();

        selectAll.addEventListener("change", () => {
          const isChecked = selectAll.checked;
          checkboxes.forEach((cb) => (cb.checked = isChecked));
          validateCheckboxes();
        });

        checkboxes.forEach((cb) => {
          cb.addEventListener("change", validateCheckboxes);
        });
      },
      focusConfirm: false,
      preConfirm: () => {
        const selectedTypes = Array.from(
          document.querySelectorAll(".code-type:checked")
        ).map((cb) => cb.value);
        const suggestion = document.getElementById("swal-input-textarea").value;

        if (selectedTypes.length === 0) {
          Swal.showValidationMessage("Please select at least one code type.");
          return false;
        }

        return { selectedTypes, suggestion };
      },
      confirmButtonText: "Refactor",
      showCancelButton: true,
      allowOutsideClick: false,
      footer:
        '<p class="text-center text-sm text-red-500 dark:text-red-300">Suggestions help improve results, <span class="font-bold">but are optional</span>.</p>',
    });

    if (!isConfirmed) return;

    const selectedTypes = formValues.selectedTypes;
    const prompt = formValues.suggestion;

    setLoadingAction("refactor");
    setIsOverlayVisible(true);
    refactorsetBtnTxt("Refactoring...");
    setisRefactorBtnPressed(true);
    setIsEditorReadOnly(true);

    try {
      const token = localStorage.getItem(LOCAL_STORAGE_TOKEN_KEY);
      if (!token) return;

      let editorCode = JSON.parse(sessionStorage.getItem(storageKey));
      let { html, css, javascript } = editorCode;

      const refactor = async (type, code) => {
        const response = await apiFetch(
          `${GENAI_API_URL}/htmlcssjsrefactor-code`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              html: code.html || html,
              css: code.css || css,
              javascript: code.javascript || javascript,
              type,
              problem_description: prompt.trim() || null,
            }),
          }
        );

        if (!response.ok)
          throw new Error(`Failed to refactor ${type.toUpperCase()}.`);
        return await response.json();
      };

      const updateCodeState = (newHtml, newCss, newJs) => {
        setCode((prevCode) => ({
          html: newHtml || prevCode.html,
          css: newCss || prevCode.css,
          javascript: newJs || prevCode.javascript,
        }));
      };

      if (selectedTypes.includes("html")) {
        setOverlayText("Refactoring HTML...");
        const resultHtml = await refactor("html", { html, css, javascript });
        updateCodeState(resultHtml.html, null, null);
        html = resultHtml.html;
        scrollToLastLine(languages[0]);
      }

      if (selectedTypes.includes("css")) {
        setOverlayText("Refactoring CSS...");
        const resultCss = await refactor("css", { html, css, javascript });
        updateCodeState(null, resultCss.css, null);
        css = resultCss.css;
        scrollToLastLine(languages[1]);
      }

      if (selectedTypes.includes("js")) {
        setOverlayText("Refactoring JS...");
        const resultJs = await refactor("js", { html, css, javascript });
        updateCodeState(null, null, resultJs.js);
        scrollToLastLine(languages[2]);
      }

      if (isLoggedIn) {
        await getRefactorCodeCount();
      }
    } catch {
      Swal.fire("Error", "Failed to refactor code.", "error");
    } finally {
      refactorsetBtnTxt("Refactor");
      setisRefactorBtnPressed(false);
      setIsEditorReadOnly(false);
      setLoadingAction(null);
      setIsOverlayVisible(false);
      setOverlayText(null);
    }
  };

  const shareLink = async () => {
    if (!isLoggedIn) {
      navigate("/login");
      return;
    }

    const editorCode = JSON.parse(sessionStorage.getItem(storageKey));
    const { html: htmlCode, css: cssCode, javascript: jsCode } = editorCode;

    const language = "htmlcssjs";
    const defaultTitle = `${language}-untitled-${Math.random()
      .toString(36)
      .substring(2, 7)}`;

    if (!editorCode) {
      Swal.fire({
        icon: "error",
        title: "Missing Information",
        text: "Please provide the code before uploading.",
      });
      return;
    }

    if (htmlCode && htmlCode.trim().length > MAX_SIZE) {
      return Swal.fire({
        title: "Error",
        text: "The HTML code size exceeds the maximum allowed size of 500 KB.",
        icon: "error",
        confirmButtonText: "OK",
      });
    }

    if (cssCode && cssCode.trim().length > MAX_SIZE) {
      return Swal.fire({
        title: "Error",
        text: "The CSS code size exceeds the maximum allowed size of 500 KB.",
        icon: "error",
        confirmButtonText: "OK",
      });
    }

    if (jsCode && jsCode.trim().length > MAX_SIZE) {
      return Swal.fire({
        title: "Error",
        text: "The JavaScript code size exceeds the maximum allowed size of 500 KB.",
        icon: "error",
        confirmButtonText: "OK",
      });
    }

    const { isDismissed } = await Swal.fire({
      title: "Create Share link",
      html: ShareLinkModal(capFirst(defaultTitle)),
      showCancelButton: true,
      allowOutsideClick: false,
      footer: `<p class="text-center text-sm text-red-500 dark:text-red-300">You can delete shared links at any time from <span class="font-bold">Homepage</span>.</p>`,
      didOpen: () => {
        const modal = Swal.getPopup();
        modal.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            Swal.clickConfirm();
          }
        });
      },
    });

    if (isDismissed) {
      return;
    }

    const finalTitle =
      document.getElementById("titleInput").value ||
      defaultTitle.charAt(0).toUpperCase() + defaultTitle.slice(1);
    const expiryTime =
      parseInt(
        document.querySelector('input[name="expiryTime"]:checked').value
      ) || 10;

    Swal.fire({
      title: "Generating...",
      text: "Please wait while your share link is being generated.",
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    try {
      const load = JSON.stringify({
        code: editorCode,
        language: language,
        title: finalTitle.trim(),
        expiryTime,
      });

      const token = localStorage.getItem(LOCAL_STORAGE_TOKEN_KEY);

      if (!token) {
        return;
      }

      const response = await apiFetch(
        `${TEMP_SHARE_API_URL}/temp-file-upload`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: load,
        }
      );

      if (!response.ok) {
        throw new Error("Failed to upload the code");
      }

      const data = await response.json();

      if (response.ok) {
        if (data?.fileUrl) {
          const url = new URL(data.fileUrl);
          const shareId = url.pathname.split("/").pop();
          const shareableLink = `${window.location.origin}/${shareId}`;

          if (isLoggedIn) {
            try {
              await saveSharedLinkCount(shareId, finalTitle, expiryTime);
            } catch {
              console.error(err);
            }
          }

          Swal.close();

          sessionStorage.removeItem(storageKey);
          sessionStorage.removeItem(SESSION_STORAGE_SHARELINKS_KEY);

          navigate(`/${shareId}`);

          Swal.fire({
            icon: "success",
            title: "Share Link is generated",
            html: `<p class="mb-2">Your code is accessible at:</p><pre class="bg-gray-100 dark:bg-neutral-800 text-neutral-800 dark:text-white p-2 rounded text-sm overflow-x-auto select-text whitespace-pre-wrap break-words">${shareableLink}</pre>`,
            confirmButtonText: "Copy",
            showCancelButton: true,
            cancelButtonText: "Close",
            allowOutsideClick: false,
            footer: `<p class="text-center text-sm text-red-500 dark:text-red-300">You can delete shared links at any time from <span class="font-bold">Homepage</span>.</p>`,
          }).then(async (result) => {
            if (result.isConfirmed) {
              try {
                await navigator.clipboard.writeText(shareableLink.toString());

                Swal.fire({
                  title: "URL Copied!",
                  text: "",
                  icon: "success",
                  timer: 2000,
                });
              } catch (err) {
                Swal.fire({
                  title: "Failed to copy",
                  text: "Could not copy the URL to clipboard.",
                  icon: "error",
                });
              }
            }
          });
        }
      }
    } catch (error) {
      Swal.close();

      Swal.fire({
        icon: "error",
        title: "Failed!!",
        text: "Please try again.",
        timer: 5000,
      });

      console.error(error);
    }
  };

  const getGenerateCodeCount = async () => {
    const token = localStorage.getItem(LOCAL_STORAGE_TOKEN_KEY);

    if (!token) {
      return;
    }

    const response = await apiFetch(
      `${BACKEND_API_URL}/api/generateCode/count`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          language: "HtmlJsCss",
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to send request");
    }
  };

  const getRefactorCodeCount = async () => {
    const token = localStorage.getItem(LOCAL_STORAGE_TOKEN_KEY);

    if (!token) {
      return;
    }

    const response = await apiFetch(
      `${BACKEND_API_URL}/api/refactorCode/count`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          language: "HtmlJsCss",
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to send request");
    }
  };

  const saveSharedLinkCount = async (shareId, title, expiryTime) => {
    try {
      const token = localStorage.getItem(LOCAL_STORAGE_TOKEN_KEY);

      if (!token) {
        return;
      }

      const countResponse = await apiFetch(
        `${BACKEND_API_URL}/api/sharedLink/count`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            shareId,
            title,
            expiryTime,
          }),
        }
      );

      if (!countResponse.ok) {
        throw new Error("Failed to send request");
      }
    } catch (err) {
      throw err;
    }
  };

  const buttonData = [
    {
      text: "Clear All",
      icon: <FaTrashAlt className="mr-2 mt-1" />,
      onClick: clearAll,
      disabled:
        (code.html.length === 0 &&
          code.css.length === 0 &&
          code.javascript.length === 0) ||
        loadingAction === "generate" ||
        loadingAction === "refactor",
      color: "bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20",
      loadingAction: null,
      iconLoading: null,
    },
    {
      text: "Download",
      icon: <FaDownload className="mr-2 mt-1" />,
      onClick: downloadFile,
      disabled:
        code.html.trim().length === 0 &&
        code.css.trim().length === 0 &&
        code.javascript.trim().length === 0,
      color: "bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/20",
      loadingAction: null,
      iconLoading: null,
    },
    {
      text: generateBtnTxt,
      icon:
        loadingAction === "generate" ? (
          <FaSpinner className="mr-2 mt-1 animate-spin" />
        ) : (
          <FaMagic className="mr-2 mt-1" />
        ),
      onClick: () => {
        if (!isRefactorBtnPressed) {
          generateCodeMain();
        }
      },
      disabled: loadingAction === "generate" || loadingAction === "refactor",
      color: "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-lg shadow-green-500/20",
      loadingAction: "generate",
      iconLoading: <FaSpinner className="mr-2 mt-1 animate-spin" />,
    },
    {
      text: refactorBtnTxt,
      icon:
        loadingAction === "refactor" ? (
          <FaSpinner className="mr-2 mt-1 animate-spin" />
        ) : (
          <FaWrench className="mr-2 mt-1" />
        ),
      onClick: () => {
        if (!isGenerateBtnPressed) {
          refactorCode();
        }
      },
      disabled:
        (code.html.trim().length === 0 &&
          code.css.trim().length === 0 &&
          code.javascript.trim().length === 0) ||
        loadingAction === "generate" ||
        loadingAction === "refactor",
      color: "bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 shadow-lg shadow-yellow-500/20",
      loadingAction: "refactor",
      iconLoading: <FaSpinner className="mr-2 mt-1 animate-spin" />,
    },
    {
      onClick: shareLink,
      color: "bg-gradient-to-r from-fuchsia-500 to-purple-500 hover:from-fuchsia-600 hover:to-purple-600 shadow-lg shadow-fuchsia-500/20",
      icon: <FaShare className="mr-2 mt-1" />,
      text: "Share",
      disabled:
        (code.html.trim().length === 0 &&
          code.css.trim().length === 0 &&
          code.javascript.trim().length === 0) ||
        loadingAction === "generate" ||
        loadingAction === "refactor",
    },
  ];

  return (
    <div className="mx-auto p-4 max-w-7xl">
      <div className="grid grid-cols-1 lg:grid-cols-3 md:grid-cols-2 gap-4">
        {languages.map((language) => (
          <EditorSection
            key={language}
            language={language}
            value={code[language]}
            editorDidMount={editorDidMount}
            onChange={handleEditorChange}
            theme={isDarkMode ? "vs-dark" : "vs-light"}
            fontSize={fontSizeMap[deviceType]}
            readOnly={isEditorReadOnly}
          />
        ))}
      </div>
      
      {/* Action Buttons */}
      <div className="mt-6 flex flex-wrap justify-center gap-4">
        {buttonData.map(({ onClick, color, icon, text, disabled }, index) => (
          <button
            key={index}
            onClick={onClick}
            className={`px-6 py-2.5 ${color} text-white inline-flex items-center justify-center rounded-lg w-full sm:w-auto font-bold text-sm transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,255,255,0.3)] focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed hacker-btn`}
            disabled={disabled}
          >
            <span className="mr-2">{icon}</span>
            {text}
          </button>
        ))}
      </div>
      
      {/* Preview Panel */}
      <div className="mt-4 relative flex flex-col items-start bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Preview Header */}
        <div className="flex items-center justify-between w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <MdPreview className="text-xl text-green-500" />
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Preview</h2>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || isOverlayVisible}
              className={`p-2 rounded-lg transition-all duration-300 ${
                isRefreshing 
                  ? "text-green-500 animate-spin"
                  : "text-gray-500 hover:text-green-500 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
              title="Refresh Preview"
            >
              <IoMdRefreshCircle className="text-2xl" />
            </button>

            {/* Fullscreen Button */}
            <button
              onClick={openPreviewFullScreen}
              disabled={isOverlayVisible}
              className="p-2 rounded-lg text-gray-500 hover:text-green-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300"
              title="Fullscreen Preview"
            >
              <SlSizeFullscreen className="text-xl" />
            </button>
          </div>
        </div>
        
        {/* Loading Overlay */}
        {isOverlayVisible && overlayText && (
          <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md flex justify-center items-center z-10 hacker-glass">
            <div className="flex flex-col items-center space-y-4 bg-white/50 dark:bg-gray-800/50 px-8 py-6 rounded-2xl shadow-2xl border border-green-500/30 hacker-card-advanced">
              <FaSpinner className="text-4xl text-green-400 animate-spin" />
              <span className="text-lg font-bold text-gray-700 dark:text-green-400 hacker-holographic animate-pulse">
                {overlayText}
              </span>
            </div>
          </div>
        )}

        {/* Iframe Preview */}
        <iframe
          ref={iframeRef}
          title="Preview"
          className="w-full h-96 bg-white"
          referrerPolicy="no-referrer"
        />
      </div>
    </div>
  );
};

export default Editor;
