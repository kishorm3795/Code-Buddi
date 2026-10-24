import React, { useEffect } from "react";
import { VscHome } from "react-icons/vsc";
import { IoTimeOutline } from "react-icons/io5";
import { useNavigate } from "react-router-dom";

export const LinkExpiredScreen = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "410 - Link Expired";
  }, []);

  return (
    <div
      data-testid="link-expired-screen"
      className="flex items-center justify-center min-h-[80vh] px-4 bg-gray-100 dark:bg-gray-900"
    >
      <div className="text-center max-w-md p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700">
        <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-full bg-amber-500/10 text-amber-500 text-4xl mb-4">
          <IoTimeOutline />
        </div>
        <h2 className="text-3xl font-extrabold text-amber-500 dark:text-amber-400">
          Shared Link Expired (410)
        </h2>
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">
          This temporary code share link has expired and its contents have been securely deleted.
        </p>
        <p className="mt-2 text-xs text-gray-400">
          Temporary code shares expire after their scheduled lifespan (e.g. 10m, 1h, 1w).
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

export default LinkExpiredScreen;
