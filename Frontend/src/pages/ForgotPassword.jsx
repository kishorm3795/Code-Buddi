import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AiOutlineExclamationCircle } from "react-icons/ai";
import { TbLoader } from "react-icons/tb";
import InputField from "../utils/InputField";
import OtpInputForm from "../utils/OtpInputForm";
import { apiClient } from "../api/client";
import { useAuth } from "../hooks/useAuth";
import {
  BACKEND_API_URL,
  EMAIL_REGEX,
  PASSWORD_REGEX,
  MAX_OTP_ATTEMPTS,
  OTP_COOLDOWN_SECONDS,
  VALIDATION_MESSAGES,
} from "../utils/constants";

const ForgotPassword = () => {
  const { logout } = useAuth();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [showConfirmPassword, setShowconfirmPassword] = useState(false);
  const [shownewPassword, setshownewPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLogin, setIsLogin] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpAttemptsLeft, setOtpAttemptsLeft] = useState(MAX_OTP_ATTEMPTS);
  const [otpResent, setOtpResent] = useState(false);
  const [otpResendError, setOtpResendError] = useState("");
  const [canResendOtp, setCanResendOtp] = useState(true);
  const [resendOtpLoading, setResendOtpLoading] = useState(false);
  const [countdown, setCountdown] = useState(OTP_COOLDOWN_SECONDS);

  const navigate = useNavigate();

  useEffect(() => {
    document.title =
      emailVerified && !otpVerified
        ? "OTP Verification"
        : otpVerified
        ? "Set New Password"
        : "Forgot Password";
  }, [emailVerified, otpVerified]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "email") {
      setEmail(value);
    } else if (name === "newPassword") {
      setNewPassword(value);
    } else if (name === "confirmPassword") {
      setConfirmPassword(value);
    }
    if (error) {
      setError("Try Again!");
    }
  };

  const handleClearOTPEror = () => {
    if (otpResendError) {
      setOtpResendError("Try Again!");
    }
  };

  const handleOtpChange = (newOtp) => {
    setOtp(newOtp);
    if (error) {
      setError("Try Again!");
    }
  };

  const maskEmail = (email) => {
    const [username, domain] = email.trim().split("@");
    const visiblePart =
      username.length <= 5 ? username[0] : username.slice(0, 5);
    return `${visiblePart}..@${domain}`;
  };

  const handleSubmitEmail = async (e) => {
    e.preventDefault();
    if (!email) {
      setSuccess("");
      setError("Please enter your email.");
      return;
    }

    if (!EMAIL_REGEX.test(email.trim())) {
      setSuccess("");
      setError(VALIDATION_MESSAGES.EMAIL_INVALID);
      return false;
    }

    setLoading(true);

    try {
      const emailCheckResponse = await apiClient(
        `${BACKEND_API_URL}/api/check-email-exists`,
        {
          method: "POST",
          credentials: "include",
          body: JSON.stringify({ email: email.trim() }),
        }
      );

      if (!emailCheckResponse.ok) {
        const data = await emailCheckResponse.json();
        setSuccess("");
        if (emailCheckResponse.status === 429) {
          setError(data.msg || VALIDATION_MESSAGES.RATE_LIMITED);
        } else {
          setError(data.msg || "Email not found.");
        }
        return;
      }

      const response = await apiClient(
        `${BACKEND_API_URL}/api/forgot-password`,
        {
          method: "POST",
          credentials: "include",
          body: JSON.stringify({ email: email.trim() }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        setSuccess("");
        if (response.status === 429) {
          setError(data.msg || VALIDATION_MESSAGES.RATE_LIMITED);
        } else {
          setError(data.msg || response.errorMessage || "Server error, please try again.");
        }
        return;
      }

      setError("");
      setSuccess("OTP Sent Successfully");
      setEmailVerified(true);
      setOtpResent(true);
      setOtpAttemptsLeft(MAX_OTP_ATTEMPTS);
    } catch {
      setSuccess("");
      setError("Server error, please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setResendOtpLoading(true);
    setOtpResendError("");

    try {
      const response = await apiClient(
        `${BACKEND_API_URL}/api/resend-otp?forgot-password=true`,
        {
          method: "POST",
          credentials: "include",
          body: JSON.stringify({
            email: email.trim(),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 429) {
          throw new Error(errorData.msg || VALIDATION_MESSAGES.RATE_LIMITED);
        }
        throw new Error(errorData.msg || "Error resending OTP.");
      }

      setOtpResent(true);
      setCanResendOtp(false);
      setCountdown(OTP_COOLDOWN_SECONDS);
      setOtpAttemptsLeft(MAX_OTP_ATTEMPTS);
      setError("");
      setSuccess("OTP resent successfully! Check your email.");
    } catch (err) {
      setSuccess("");
      setOtpResendError(err.message || "Server error while resending OTP.");
    } finally {
      handleClearOTPEror();
      setResendOtpLoading(false);
    }
  };

  useEffect(() => {
    let timer;
    if (!canResendOtp) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setCanResendOtp(true);
            return OTP_COOLDOWN_SECONDS;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [canResendOtp]);

  const handleSubmitOtp = async (e) => {
    e.preventDefault();
    if (!otp) {
      setSuccess("");
      setError("Please enter the OTP.");
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient(`${BACKEND_API_URL}/api/reset-password`, {
        method: "POST",
        credentials: "include",
        body: JSON.stringify({
          email: email.trim(),
          otp: otp.trim?.() ?? otp,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        const nextAttempts = Math.max(0, otpAttemptsLeft - 1);
        setOtpAttemptsLeft(nextAttempts);
        setSuccess("");

        if (response.status === 429 || nextAttempts === 0) {
          setError(
            data.msg ||
            VALIDATION_MESSAGES.OTP_EXPIRED_OR_TOO_MANY_ATTEMPTS
          );
        } else {
          setError(
            `${data.msg || "Invalid OTP or OTP expired."}. ${nextAttempts} attempt${nextAttempts === 1 ? "" : "s"} remaining.`
          );
        }
        return;
      }

      setError("");
      setSuccess("OTP Verified Successfully");
      setOtpVerified(true);
    } catch {
      setSuccess("");
      setError("Server error, please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitNewPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setSuccess("");
      setError("Passwords do not match.");
      return;
    }

    if (newPassword.length < 8 || confirmPassword.length < 8) {
      setSuccess("");
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (
      !PASSWORD_REGEX.test(newPassword) ||
      !PASSWORD_REGEX.test(confirmPassword)
    ) {
      setSuccess("");
      setError(VALIDATION_MESSAGES.PASSWORD_INVALID);
      return false;
    }

    setLoading(true);

    try {
      const response = await apiClient(
        `${BACKEND_API_URL}/api/update-password`,
        {
          method: "POST",
          credentials: "include",
          body: JSON.stringify({
            email: email.trim(),
            otp: otp.trim?.() ?? otp,
            password: newPassword.trim(),
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        setSuccess("");
        if (response.status === 429) {
          setError(data.msg || VALIDATION_MESSAGES.RATE_LIMITED);
        } else {
          setError(data.msg || "Error updating password.");
        }
        return;
      }

      setError("");
      setSuccess("Password reset successfully");

      setTimeout(async () => {
        await logout();
        navigate("/login");
      }, 500);
    } catch {
      setSuccess("");
      setError("Server error, please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh] bg-gray-100 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-3xl font-semibold text-center text-gray-700 dark:text-gray-200 mb-6">
          {emailVerified && !otpVerified
            ? "OTP Verification"
            : otpVerified
            ? "Set New Password"
            : "Forgot Password"}
        </h2>

        {!emailVerified && (
          <form onSubmit={handleSubmitEmail}>
            <InputField
              label="Email"
              type="email"
              value={email}
              onChange={handleInputChange}
              required
              name="email"
              disabled={loading}
            />

            {error && (
              <p className="text-red-600 dark:text-red-400 text-center my-4">
                {error}
              </p>
            )}

            {otpResent && !error && (
              <p className="text-green-600 dark:text-green-400 text-center my-4">
                OTP sent successfully! Check your email.
              </p>
            )}

            {success && (
              <p className="text-green-600 dark:text-green-400 text-center my-4">
                {success}
              </p>
            )}

            <button
              type="submit"
              className="w-full p-2 text-sm cursor-pointer bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none transition duration-300 dark:bg-blue-500 dark:hover:bg-blue-400 ease-in-out transform hover:scale-x-95 hover:shadow-lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <TbLoader className="animate-spin inline-block mr-1" />{" "}
                  Sending OTP...
                </>
              ) : (
                "Send OTP"
              )}
            </button>
          </form>
        )}

        {emailVerified && !otpVerified && (
          <form onSubmit={handleSubmitOtp}>
            <div className="mt-4 p-4 mb-6 bg-blue-100 dark:bg-blue-900 border border-blue-200 dark:border-blue-600 rounded-md shadow-lg max-w-full sm:max-w-md mx-auto">
              <div className="flex items-center">
                <AiOutlineExclamationCircle className="mr-2 text-xl" />
                <p className="text-sm text-justify flex-1">
                  Please check your email{" "}
                  <span
                    title={email}
                    className="font-medium underline underline-offset-2"
                  >
                    {maskEmail(email)}
                  </span>{" "}
                  for the OTP. If you don't see it, be sure to check your{" "}
                  <span className="font-bold">spam folder</span>.{" "}
                  <span className="italic">
                    If the OTP doesn't appear in your inbox, try using a
                    different email address.
                  </span>
                </p>
              </div>
            </div>
            <OtpInputForm onOtpChange={handleOtpChange} />
            <div className="text-center font-mono text-xs text-gray-500 dark:text-gray-400 my-2">
              Remaining attempts:{" "}
              <span
                className={`font-bold ${
                  otpAttemptsLeft <= 2 ? "text-red-500" : "text-blue-500"
                }`}
              >
                {otpAttemptsLeft} of {MAX_OTP_ATTEMPTS}
              </span>
            </div>
            {error && (
              <p className="text-red-600 dark:text-red-400 text-center my-4">
                {error}
              </p>
            )}
            {success && (
              <p className="text-green-600 dark:text-green-400 text-center my-4">
                {success}
              </p>
            )}
            <button
              type="submit"
              className="w-full p-2 text-sm cursor-pointer bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none transition duration-300 dark:bg-blue-500 dark:hover:bg-blue-400 ease-in-out transform hover:scale-x-95 hover:shadow-lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <TbLoader className="animate-spin inline-block mr-1" />{" "}
                  Verifying OTP...
                </>
              ) : (
                "Verify OTP"
              )}
            </button>
            <button
              type="button"
              onClick={handleResendOtp}
              className="w-full text-sm cursor-pointer text-blue-600 dark:text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 focus:outline-none transition duration-300 ease-in-out transform hover:scale-x-95 hover:underline mt-4"
              disabled={resendOtpLoading || !canResendOtp}
            >
              {resendOtpLoading ? (
                <>
                  <TbLoader className="animate-spin text-xl inline-block mr-1" />{" "}
                  Resending OTP...
                </>
              ) : canResendOtp ? (
                "Resend OTP"
              ) : (
                `Wait ${countdown}s`
              )}
            </button>
          </form>
        )}

        {otpVerified && (
          <form onSubmit={handleSubmitNewPassword}>
            <InputField
              label="New Password"
              type={shownewPassword ? "text" : "password"}
              value={newPassword}
              onChange={handleInputChange}
              required
              name="newPassword"
              showPassword={shownewPassword}
              onTogglePassword={() => setshownewPassword((prev) => !prev)}
              disabled={loading}
            />

            <InputField
              label="Confirm Password"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={handleInputChange}
              required
              name="confirmPassword"
              showPassword={showConfirmPassword}
              onTogglePassword={() => setShowconfirmPassword((prev) => !prev)}
              disabled={loading}
            />

            {error && (
              <p className="text-red-600 dark:text-red-400 text-center my-4">
                {error}
              </p>
            )}

            {success && (
              <p className="text-green-600 dark:text-green-400 text-center my-4">
                {success}
              </p>
            )}

            <button
              type="submit"
              className="w-full p-2 cursor-pointer text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none transition duration-300 dark:bg-blue-500 dark:hover:bg-blue-400 ease-in-out transform hover:scale-x-95 hover:shadow-lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <TbLoader className="animate-spin text-xl inline-block mr-1" />{" "}
                  Resetting Password...
                </>
              ) : (
                "Reset Password"
              )}
            </button>
          </form>
        )}

        {!isLogin && (
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
              <button
                onClick={() => navigate("/login")}
                className="text-blue-600 cursor-pointer dark:text-blue-400 hover:underline"
              >
                Login
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
