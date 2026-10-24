import React, { Suspense, lazy } from "react";
import { FaSpinner } from "react-icons/fa6";

const MonacoEditor = lazy(() => import("@monaco-editor/react"));

const EditorFallback = ({ language = "Code", height = "500px" }) => (
  <div
    style={{ height }}
    className="flex flex-col items-center justify-center w-full bg-gray-50/50 dark:bg-gray-900/40 text-gray-400 font-mono text-sm border border-gray-200 dark:border-green-500/20 rounded-lg"
  >
    <FaSpinner className="animate-spin text-2xl mb-2 text-green-500" />
    <span>Loading {language} Editor...</span>
  </div>
);

export const LazyMonacoEditor = (props) => {
  return (
    <Suspense
      fallback={
        <EditorFallback
          language={props.language}
          height={props.height || "500px"}
        />
      }
    >
      <MonacoEditor {...props} />
    </Suspense>
  );
};

export default LazyMonacoEditor;
