import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { TbLoader } from "react-icons/tb";
import InputField from "../utils/InputField";
import { apiFetch } from "../utils/apifetch";
import {
  SESSION_STORAGE_SHARELINKS_KEY,
  LOCAL_STORAGE_TOKEN_KEY,
  LOCAL_STORAGE_USERNAME_KEY,
  LOCAL_STORAGE_LOGIN_KEY,
  BACKEND_API_URL,
  EMAIL_REGEX,
  PASSWORD_REGEX,
  LOCAL_STORAGE_GOOGLE_USER,
} from "../utils/constants";

const Login = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [googleLoginError, setGoogleLoginError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Login - CodeBuddi";
  }, []);

  const handleAuthSuccess = (data) => {
    localStorage.setItem(LOCAL_STORAGE_TOKEN_KEY, data.token);
    localStorage.setItem(LOCAL_STORAGE_USERNAME_KEY, data.username);
    localStorage.setItem(LOCAL_STORAGE_LOGIN_KEY, "true");
    localStorage.setItem(LOCAL_STORAGE_GOOGLE_USER, data.isgoogleuser);
    sessionStorage.removeItem(SESSION_STORAGE_SHARELINKS_KEY);
    navigate(window.history.length > 2 ? -1 : "/");
    location.reload();
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));

    if (error || googleLoginError) {
      setError("");
      setGoogleLoginError("");
    }
  };

  const validateForm = () => {
    if (!EMAIL_REGEX.test(formData.email.trim())) {
      setError("Invalid email format");
      return false;
    }
    if (formData.password.trim().length < 8) {
      setError("Password must be at least 8 characters long");
      return false;
    }
    if (!PASSWORD_REGEX.test(formData.password.trim())) {
      setError("Invalid password format");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);

    if (error || googleLoginError) {
      setError("");
      setGoogleLoginError("");
    }

    try {
      const response = await apiFetch(`${BACKEND_API_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email.trim(),
          password: formData.password.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        if (data.msg === "Email not verified") {
          setError(
            "Email is not verified. Please check your inbox or register again."
          );
        } else {
          setError(data.msg || "Invalid credentials!");
        }
        return;
      }
      handleAuthSuccess(data);
    } catch (err) {
      setError(err.message || "Server error, please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLoginSuccess = async (credentialResponse) => {
    setLoading(true);

    if (error || googleLoginError) {
      setError("");
      setGoogleLoginError("");
    }

    try {
      const idToken = credentialResponse.credential;
      const response = await apiFetch(`${BACKEND_API_URL}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: idToken }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error("Google authentication failed.");
      }
      handleAuthSuccess(data);
    } catch (err) {
      setGoogleLoginError("Google login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLoginError = () => {
    setGoogleLoginError("Google login failed. Please try again.");
  };

  return (
    <div className="flex items-center justify-center min-h-[80dvh] bg-gray-100 dark:bg-gray-950 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 tron-grid opacity-20"></div>
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-32 h-32 bg-[#00f0ff] rounded-full filter blur-[100px] opacity-10 animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-40 h-40 bg-[#bf00ff] rounded-full filter blur-[100px] opacity-10 animate-pulse"></div>
      </div>

      <div className="bg-white dark:bg-gray-900/90 p-8 rounded-lg shadow-2xl w-full max-w-md relative z-10 tron-border">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold tron-text-gradient mb-2 font-['Orbitron']">
            CodeBuddi
          </h2>
          <p className="text-gray-500 dark:text-gray-400 font-mono text-sm">
            Access Your Workspace
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <InputField
            label="Email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            required
            disabled={loading}
          />
          <InputField
            label="Password"
            type={showPassword ? "text" : "password"}
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            required
            showPassword={showPassword}
            onTogglePassword={() => setShowPassword((prev) => !prev)}
            disabled={loading}
          />

          {error && (
            <p className="text-[#ff0055] dark:text-[#ff0055] text-center mb-4 font-mono text-sm">
              ⚠ {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full py-3 cursor-pointer text-sm bg-gradient-to-r from-[#00f0ff] to-[#00d4ff] text-gray-900 font-bold rounded-md hover:from-[#00d4ff] hover:to-[#00f0ff] focus:outline-none transition-all duration-300 font-['Orbitron'] tracking-wider shadow-lg shadow-[#00f0ff]/20 hover:shadow-[#00f0ff]/40 transform hover:scale-[1.02]"
            disabled={loading}
          >
            {loading ? (
              <>
                <TbLoader className="animate-spin text-xl inline-block mr-2" />
                Authenticating...
              </>
            ) : (
              "Login"
            )}
          </button>
        </form>

        <div className="my-6 flex items-center">
          <div className="flex-grow border-t border-gray-300 dark:border-gray-700"></div>
          <span className="flex-shrink mx-4 text-gray-500 dark:text-gray-400 font-mono text-xs">
            OR CONNECT WITH
          </span>
          <div className="flex-grow border-t border-gray-300 dark:border-gray-700"></div>
        </div>

        <div className="flex justify-center w-full">
          <div className="relative w-fit max-w-full">
            <GoogleLogin
              onSuccess={handleGoogleLoginSuccess}
              onError={handleGoogleLoginError}
              theme="filled_black"
              shape="rectangular"
              scope="profile email"
              text="continue_with"
              useOneTap
            />

            {loading && (
              <div
                className="absolute inset-0 z-50 bg-transparent cursor-not-allowed"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              ></div>
            )}
          </div>
        </div>

        {googleLoginError && (
          <p className="text-[#ff0055] dark:text-[#ff0055] text-center my-4 font-mono text-sm">
            ⚠ {googleLoginError}
          </p>
        )}

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            New to CodeBuddi?{" "}
            <button
              onClick={() => navigate("/register")}
              className="text-[#00f0ff] cursor-pointer hover:text-[#00d4ff] hover:underline decoration-[#00f0ff] underline-offset-4 transition-all font-mono"
            >
              Create Account
            </button>
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-3">
            <button
              onClick={() => navigate("/forgot-password")}
              className="text-[#00f0ff] cursor-pointer hover:text-[#00d4ff] hover:underline decoration-[#00f0ff] underline-offset-4 transition-all font-mono"
            >
              Forgot Password?
            </button>
          </p>
        </div>

        {/* Decorative Elements */}
        <div className="absolute -top-2 -left-2 w-6 h-6 border-t-2 border-l-2 border-[#00f0ff]"></div>
        <div className="absolute -top-2 -right-2 w-6 h-6 border-t-2 border-r-2 border-[#00f0ff]"></div>
        <div className="absolute -bottom-2 -left-2 w-6 h-6 border-b-2 border-l-2 border-[#00f0ff]"></div>
        <div className="absolute -bottom-2 -right-2 w-6 h-6 border-b-2 border-r-2 border-[#00f0ff]"></div>
      </div>
    </div>
  );
};

export default Login;

