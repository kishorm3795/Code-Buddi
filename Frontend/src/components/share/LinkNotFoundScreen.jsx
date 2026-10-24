import React, { useEffect } from "react";
import { VscHome } from "react-icons/vsc";
import { FiAlertCircle } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

export const LinkNotFoundScreen = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "404 - Link Not Found";
  }, []);

  return (
    <div
      data-testid="link-not-found-screen"
      className="flex items-center justify-center min-h-[80vh] px-4 bg-gray-100 dark:bg-gray-900"
    >
      <div className="text-center max-w-md p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700">
        <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-full bg-red-500/10 text-red-500 text-4xl mb-4">
          <FiAlertCircle />
        </div>
        <h2 className="text-3xl font-extrabold text-red-500 dark:text-red-400">
          Shared Link Not Found (404)
        </h2>
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">
          The shared code link you are looking for does not exist or may have been removed by its creator.
        </p>
        <p className="mt-2 text-xs text-gray-400">
          Please check the URL or request a new link from the sender.
        </p>
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer flex items-center space-x-2 transition duration-300 ease-in-out transform hover:scale-105 shadow-md"
          >
            <VscHome className="text-xl mr-2" />
            Go to Homepage
          </button>
        </div>
      </div>
    </div>
  );
};

export default LinkNotFoundScreen;
