import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FaSpinner, FaBarsStaggered } from "react-icons/fa6";
import { SiIfixit } from "react-icons/si";
import { RxMoon, RxSun } from "react-icons/rx";
import Swal from "sweetalert2/dist/sweetalert2.js";
import "sweetalert2/src/sweetalert2.scss";
import {
  SESSION_STORAGE_SHARELINKS_KEY,
  SESSION_STORAGE_FETCH_STATUS_KEY,
  LOCAL_STORAGE_TOKEN_KEY,
  LOCAL_STORAGE_USERNAME_KEY,
  LOCAL_STORAGE_LOGIN_KEY,
  LOCAL_STORAGE_THEME_KEY,
  LOCAL_STORAGE_GOOGLE_USER,
  BACKEND_API_URL,
} from "../utils/constants";

const Header = ({ isDarkMode, toggleTheme }) => {
  const [username, setUsername] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setLoading] = useState(true);

  const baseUrl = window.location.origin;

  const clearAuthState = () => {
    localStorage.removeItem(LOCAL_STORAGE_TOKEN_KEY);
    localStorage.removeItem(LOCAL_STORAGE_USERNAME_KEY);
    localStorage.removeItem(LOCAL_STORAGE_LOGIN_KEY);
    localStorage.removeItem(LOCAL_STORAGE_GOOGLE_USER);
    sessionStorage.removeItem(SESSION_STORAGE_SHARELINKS_KEY);
    sessionStorage.removeItem(SESSION_STORAGE_FETCH_STATUS_KEY);
  };

  useEffect(() => {
    const token = localStorage.getItem(LOCAL_STORAGE_TOKEN_KEY);
    const storedUsername = localStorage.getItem(LOCAL_STORAGE_USERNAME_KEY);
    const login = localStorage.getItem(LOCAL_STORAGE_LOGIN_KEY);

    if (token && storedUsername && login === "true") {
      fetchUserData(token, storedUsername);
    } else {
      clearAuthState();
      setIsLoggedIn(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === LOCAL_STORAGE_GOOGLE_USER) {
        clearAuthState();
        setIsLoggedIn(false);
        setUsername("");
        location.reload();
      }
    };

    const timerId = setTimeout(() => {
      const token = localStorage.getItem(LOCAL_STORAGE_TOKEN_KEY);
      if (!token && !isLoggedIn) return;
      window.addEventListener("storage", handleStorageChange);
    }, 2000);

    return () => {
      clearTimeout(timerId);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [isLoggedIn]);

  useEffect(() => {
    (() => {
      const savedTheme = localStorage.getItem(LOCAL_STORAGE_THEME_KEY);
      const isDarkMode = savedTheme === "dark";
      document.documentElement.classList.toggle("dark", isDarkMode);

      const validKeys = [
        LOCAL_STORAGE_THEME_KEY,
        LOCAL_STORAGE_TOKEN_KEY,
        LOCAL_STORAGE_USERNAME_KEY,
        LOCAL_STORAGE_LOGIN_KEY,
      ];

      window.addEventListener("storage", (event) => {
        if (validKeys.includes(event.key)) {
          location.reload();
        }
      });
    })();
  }, []);

  const fetchUserData = async (token, storedUsername) => {
    try {
      const response = await fetch(`${BACKEND_API_URL}/api/protected`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.username) {
        if (data.username !== storedUsername) {
          clearAuthState();
          setIsLoggedIn(false);
          setUsername("");
          location.reload();
          return;
        }

        setUsername(data.username);
        setIsLoggedIn(true);
      } else {
        clearAuthState();
        setIsLoggedIn(false);
        setUsername("");
        location.reload();
      }
    } catch (error) {
      location.reload();
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Swal.fire({
      title: "Disconnect?",
      html: "Are you sure you want to disconnect from CodeBuddi?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, disconnect",
      cancelButtonText: "No, stay connected",
      confirmButtonColor: "#ff0055",
      reverseButtons: true,
      allowOutsideClick: false,
      background: isDarkMode ? '#1e293b' : '#ffffff',
      titleColor: isDarkMode ? '#00f0ff' : '#0f172a',
    }).then((result) => {
      if (result.isConfirmed) {
        clearAuthState();
        setIsLoggedIn(false);
        setUsername("");
        location.reload();
      }
    });
  };

  const formatUsername = (username) => {
    if (username.length > 15) {
      return `${username.slice(0, 5)}...${username.slice(-5)}`;
    }
    return username;
  };

  useEffect(() => {
    if (isLoading) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
  }, [isLoading]);

  return (
    <>
      {isLoading && (
        <div className="fixed inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="flex items-center space-x-3 bg-white dark:bg-gray-800 px-6 py-4 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <FaSpinner className="text-2xl text-cyan-500 animate-spin" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Loading...
            </span>
          </div>
        </div>
      )}

      <header className="bg-white/70 dark:bg-gray-950/70 backdrop-blur-2xl border-b border-cyan-500/20 sticky top-0 z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link
              to={`${baseUrl}`}
              aria-label="Go to CodeBuddi homepage"
              className="flex items-center space-x-2 group relative"
            >
              <span
                className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent group-hover:tron-glitch"
                data-text="CodeBuddi"
              >
                CodeBuddi
              </span>
              <div className="absolute -bottom-1 left-0 w-0 h-0.5 bg-cyan-400 group-hover:w-full transition-all duration-300 shadow-[0_0_10px_#00ffff]"></div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              {isLoggedIn ? (
                <>
                  <Link
                    to={`${baseUrl}/account/${username}`}
                    className="text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-cyan-400 hover:tron-glow-text transition-all duration-300"
                    title={username.trim()}
                    aria-label={`Go to ${formatUsername(username)}'s account`}
                  >
                    {formatUsername(username)}'s Account
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-red-400 hover:tron-glow-red transition-all duration-300 cursor-pointer"
                    disabled={isLoading}
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to={`${baseUrl}/login`}
                    className="text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-cyan-400 hover:tron-glow-text transition-all duration-300"
                    aria-label="Go to Login page"
                  >
                    Login
                  </Link>
                  <Link
                    to={`${baseUrl}/register`}
                    className="px-5 py-2 text-sm font-bold text-gray-900 bg-cyan-400 rounded-md hover:bg-cyan-300 transition-all duration-300 shadow-[0_0_15px_rgba(0,255,255,0.4)] hover:shadow-[0_0_25px_rgba(0,255,255,0.6)] transform hover:-translate-y-0.5"
                    aria-label="Go to Register page"
                  >
                    Register
                  </Link>
                </>
              )}
            </nav>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-3">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {isDarkMode ? (
                  <RxMoon className="w-5 h-5" />
                ) : (
                  <RxSun className="w-5 h-5" />
                )}
              </button>

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors md:hidden"
              >
                {!isDropdownOpen ? (
                  <FaBarsStaggered className="w-5 h-5" />
                ) : (
                  <SiIfixit className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <nav className="md:hidden border-t border-gray-200 dark:border-gray-800">
          {isDropdownOpen && (
            <div className="px-4 py-4 space-y-3 bg-white dark:bg-gray-900">
              {isLoggedIn ? (
                <>
                  <Link
                    to={`${baseUrl}/account/${username}`}
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-cyan-600 dark:hover:text-cyan-400"
                    title={username.trim()}
                    aria-label={`Go to ${formatUsername(username)}'s account page`}
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    {formatUsername(username)}'s Account
                  </Link>

                  <button
                    onClick={() => {
                      handleLogout();
                      setIsDropdownOpen(false);
                    }}
                    className="block w-full text-left text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-cyan-600 dark:hover:text-cyan-400"
                    disabled={isLoading}
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-cyan-600 dark:hover:text-cyan-400"
                    aria-label="Go to Login page"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-cyan-600 dark:hover:text-cyan-400"
                    aria-label="Go to Register page"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    Register
                  </Link>
                </>
              )}
            </div>
          )}
        </nav>
      </header>
    </>
  );
};

export default Header;

