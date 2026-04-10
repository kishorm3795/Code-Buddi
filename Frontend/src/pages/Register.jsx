import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AiOutlineExclamationCircle } from "react-icons/ai";
import { TbLoader } from "react-icons/tb";
import { GoogleLogin } from "@react-oauth/google";
import InputField from "../utils/InputField";
import OtpInputForm from "../utils/OtpInputForm";
import { apiFetch } from "../utils/apifetch";
import {
  SESSION_STORAGE_SHARELINKS_KEY,
  LOCAL_STORAGE_TOKEN_KEY,
  LOCAL_STORAGE_USERNAME_KEY,
  LOCAL_STORAGE_LOGIN_KEY,
  LOCAL_STORAGE_GOOGLE_USER,
  BACKEND_API_URL,
  USERNAME_REGEX,
  EMAIL_REGEX,
  PASSWORD_REGEX,
} from "../utils/constants";

const Register = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    newPassword: "",
  });
  const [error, setError] = useState("");
  const [googleLoginError, setGoogleLoginError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpResent, setOtpResent] = useState(false);
  const [otpResendError, setOtpResendError] = useState("");
  const [canResendOtp, setCanResendOtp] = useState(true);
  const [countdown, setCountdown] = useState(30);
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendOtpLoading, setResendOtpLoading] = useState(false);
  const [wrongEmailLoading, setWrongEmailLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Register - CodeBuddi";
  }, []);

  const handleAuthSuccess = (data) => {
    localStorage.setItem(LOCAL_STORAGE_TOKEN_KEY, data.token);
    localStorage.setItem(LOCAL_STORAGE_USERNAME_KEY, data.username);
    localStorage.setItem(LOCAL_STORAGE_LOGIN_KEY, "true");
    sessionStorage.removeItem(SESSION_STORAGE_SHARELINKS_KEY);
    localStorage.setItem(LOCAL_STORAGE_GOOGLE_USER, data.isgoogleuser);
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

  const handleClearOTPEror = () => {
    if (otpError) {
      setGoogleLoginError("");
      setOtpError("");
    }

    if (otpResendError) {
      setOtpResent(false);
      setGoogleLoginError("");
      setOtpResendError("");
    }
  };

  const validateForm = () => {
    const email = formData.email.trim();
    const username = formData.username.trim();
    const newPassword = formData.newPassword.trim();

    if (!EMAIL_REGEX.test(email)) {
      setError("Invalid email format");
      return false;
    }

    if (!USERNAME_REGEX.test(username)) {
      setError(
        "Username can only contain letters, numbers, underscores, hyphens, and periods (5-30 characters)."
      );
      return false;
    }

    if (username.length < 5 || username.length > 30) {
      setError("Username should be between 5 and 30 characters");
      return false;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long");
      return false;
    }

    if (!PASSWORD_REGEX.test(newPassword)) {
      setError("Invalid password format");
      return false;
    }

    return true;
  };

  const handleOtpChange = (newOtp) => {
    setOtp(newOtp);

    if (error || googleLoginError) {
      setError("");
      setGoogleLoginError("");
    }
  };

  const maskEmail = (email) => {
    const [username, domain] = email.trim().split("@");
    const visiblePart =
      username.length <= 5 ? username[0] : username.slice(0, 5);
    return `${visiblePart}..@${domain}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    const { username, email, newPassword } = formData;

    try {
      const response = await apiFetch(`${BACKEND_API_URL}/api/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim(),
          password: newPassword.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();

        if (errorData.msg === "Email not verified.") {
          setOtpSent(true);
          setLoading(false);
          setIsRegistered(true);
          return;
        } else {
          throw new Error(errorData.msg || "Server error, please try again.");
        }
      }

      setOtpSent(true);
      setLoading(false);
      setIsRegistered(true);
      setOtpResent(true);
    } catch (err) {
      setError(err.message || "Server error, please try again.");
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

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setOtpLoading(true);

    try {
      const response = await apiFetch(`${BACKEND_API_URL}/api/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email.trim(),
          otp: otp.trim?.() ?? otp,
          password: formData.newPassword.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.msg || "OTP verification failed.");
      }

      const data = await response.json();

      localStorage.setItem(LOCAL_STORAGE_TOKEN_KEY, data.token);
      localStorage.setItem(LOCAL_STORAGE_USERNAME_KEY, data.username);
      localStorage.setItem(LOCAL_STORAGE_LOGIN_KEY, "true");
      sessionStorage.removeItem(SESSION_STORAGE_SHARELINKS_KEY);

      navigate(window.history.length > 2 ? -1 : "/");
      location.reload();
    } catch (err) {
      setOtpError(err.msg || "OTP verification failed.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setResendOtpLoading(true);

    try {
      const response = await apiFetch(`${BACKEND_API_URL}/api/resend-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.msg || "Error resending OTP.");
      }

      setOtpResent(false);
      setOtpResendError("");
      setOtpResent(true);
      setCanResendOtp(false);
      setCountdown(30);
    } catch (err) {
      setOtpResent(false);
      setOtpResendError(err.message || "Server error while resending OTP.");
    } finally {
      handleClearOTPEror();
      setResendOtpLoading(false);
    }
  };

  const handleWrongEmail = async () => {
    try {
      setWrongEmailLoading(true);

      const response = await apiFetch(`${BACKEND_API_URL}/api/wrong-email`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok || data.msg == "User not found") {
        setTimeout(() => {
          navigate("/register");
          location.reload();
        }, 200);
      } else {
        setError(data.msg);
      }
    } catch (err) {
      setError("Error deleting the account, please try again.");
    } finally {
      setWrongEmailLoading(false);
    }
  };

  useEffect(() => {
    let timer;
    if (!canResendOtp) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev === 1) {
            clearInterval(timer);
            setCanResendOtp(true);
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [canResendOtp]);

  return (
    <div className="flex justify-center items-center min-h-[80dvh] bg-gray-100 dark:bg-gray-950 md:min-h-[90dvh] relative overflow-hidden hacker-grid-bg hacker-scanlines">
      {/* Background Effects */}
      <div className="absolute inset-0 hacker-digital-rain opacity-10"></div>
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-10 right-10 w-32 h-32 bg-[#bf00ff] rounded-full filter blur-[100px] opacity-10 animate-pulse"></div>
        <div className="absolute bottom-10 left-10 w-40 h-40 bg-[#00ff00] rounded-full filter blur-[100px] opacity-10 animate-pulse"></div>
      </div>

      <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl p-8 rounded-lg shadow-2xl w-full max-w-md relative z-10 hacker-card-advanced border border-green-500/30">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold hacker-text-gradient mb-2 font-['Share Tech Mono']">
            {isRegistered ? "Verify Email" : "CodeBuddi"}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 font-mono text-sm">
            {isRegistered ? "Enter the code sent to your email" : "Create Your Account"}
          </p>
        </div>

        {isRegistered && (
          <div className="mt-4 p-4 mb-6 bg-[#00ff00]/10 dark:bg-[#00ff00]/5 border border-[#00ff00]/30 rounded-md shadow-lg max-w-full sm:max-w-md mx-auto">
            <div className="flex items-center">
              <AiOutlineExclamationCircle className="mr-2 text-xl text-[#00ff00]" />
              <p className="text-sm text-justify flex-1 text-gray-700 dark:text-gray-300">
                Please check your email{" "}
                <span
                  title={formData.email}
                  className="font-medium text-[#00ff00] underline underline-offset-2"
                >
                  {maskEmail(formData.email)}
                </span>{" "}
                for the OTP. If you don't see it, be sure to check your{" "}
                <span className="font-bold text-[#ff6b35]">spam folder</span>.{" "}
                <span className="italic">
                  If the OTP doesn't appear in your inbox, try using a different
                  email address.
                </span>
              </p>
            </div>
          </div>
        )}

        {!otpSent ? (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="focus-within:hacker-glow-sm rounded-lg transition-all duration-300">
                <InputField
                  label="Username"
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                />
              </div>

              <div className="focus-within:hacker-glow-sm rounded-lg transition-all duration-300">
                <InputField
                  label="Email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                />
              </div>

              <div className="focus-within:hacker-glow-sm rounded-lg transition-all duration-300">
                <InputField
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleInputChange}
                  required
                  showPassword={showPassword}
                  onTogglePassword={() => setShowPassword((prev) => !prev)}
                  disabled={loading}
                />
              </div>

              {error && (
                <p className="text-[#ff0055] dark:text-[#ff0055] text-center my-4 font-mono text-sm">
                  ⚠ {error}
                </p>
              )}

              <button
                type="submit"
                className="w-full py-3 cursor-pointer text-sm bg-gradient-to-r from-[#00ff00] to-[#00cc00] text-gray-900 font-bold rounded-md hover:from-[#00cc00] hover:to-[#00ff00] focus:outline-none transition-all duration-300 font-['Share Tech Mono'] tracking-wider shadow-lg shadow-[#00ff00]/20 hover:shadow-[#00ff00]/40 transform hover:scale-[1.02]"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <TbLoader className="animate-spin text-xl inline-block mr-2" />{" "}
                    Creating Account...
                  </>
                ) : (
                  "Register"
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
          </>
        ) : (
          <OtpInputForm onOtpChange={handleOtpChange} />
        )}

        {otpError && (
          <p className="text-[#ff0055] dark:text-[#ff0055] text-center my-4 font-mono text-sm">
            ⚠ {otpError}
          </p>
        )}

        {otpResent && !otpError && (
          <p className="text-[#39ff14] dark:text-[#39ff14] text-center my-4 font-mono text-sm">
            ✓ OTP sent successfully! Check your email.
          </p>
        )}

        {otpResendError && (
          <p className="text-[#ff0055] dark:text-[#ff0055] text-center my-4 font-mono text-sm">
            ⚠ {otpResendError}
          </p>
        )}

        {otpSent && (
          <>
            <button
              type="submit"
              onClick={handleOtpSubmit}
              className="w-full py-3 text-sm cursor-pointer bg-gradient-to-r from-[#00ff00] to-[#00cc00] text-gray-900 font-bold rounded-md hover:from-[#00cc00] hover:to-[#00ff00] focus:outline-none transition-all duration-300 font-['Share Tech Mono'] tracking-wider shadow-lg shadow-[#00ff00]/20 hover:shadow-[#00ff00]/40 transform hover:scale-[1.02]"
              disabled={otpLoading}
            >
              {otpLoading ? (
                <>
                  <TbLoader className="animate-spin text-xl inline-block mr-2" />{" "}
                  Verifying...
                </>
              ) : (
                "Verify OTP"
              )}
            </button>
            <div className="flex gap-4 mt-4">
              <button
                type="button"
                onClick={handleResendOtp}
                className="w-full text-sm cursor-pointer text-[#00ff00] hover:text-[#00cc00] focus:outline-none transition-all duration-300 font-mono"
                disabled={resendOtpLoading || !canResendOtp}
              >
                {resendOtpLoading ? (
                  <>
                    <TbLoader className="animate-spin text-base inline-block mr-1" />{" "}
                    Resending...
                  </>
                ) : canResendOtp ? (
                  "Resend OTP"
                ) : (
                  `Wait ${countdown}s`
                )}
              </button>

              <button
                type="button"
                onClick={handleWrongEmail}
                disabled={wrongEmailLoading}
                className="w-full text-sm cursor-pointer text-[#ff6b35] hover:text-[#ff8c5a] focus:outline-none transition-all duration-300 font-mono"
              >
                {wrongEmailLoading ? (
                  <>
                    <TbLoader className="animate-spin text-base inline-block mr-1" />{" "}
                    Processing...
                  </>
                ) : (
                  "Wrong Email"
                )}
              </button>
            </div>
          </>
        )}

        {!isRegistered && !otpSent && (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Already on CodeBuddi?{" "}
              <button
                onClick={() => navigate("/login")}
                className="text-[#00ff00] cursor-pointer hover:text-[#00cc00] hover:underline decoration-[#00ff00] underline-offset-4 transition-all font-mono"
              >
                Login here
              </button>
            </p>
          </div>
        )}

        {/* Decorative Elements */}
        <div className="absolute -top-2 -left-2 w-6 h-6 border-t-2 border-l-2 border-[#00ff00]"></div>
        <div className="absolute -top-2 -right-2 w-6 h-6 border-t-2 border-r-2 border-[#00ff00]"></div>
        <div className="absolute -bottom-2 -left-2 w-6 h-6 border-b-2 border-l-2 border-[#00ff00]"></div>
        <div className="absolute -bottom-2 -right-2 w-6 h-6 border-b-2 border-r-2 border-[#00ff00]"></div>
      </div>
    </div>
  );
};

export default Register;

