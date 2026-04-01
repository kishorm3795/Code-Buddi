import React from "react";

const InputField = ({
  label,
  type,
  value,
  onChange,
  required,
  name,
  showPassword,
  onTogglePassword,
  disabled = false,
}) => {
  const isPasswordField = [
    "password",
    "newPassword",
    "confirmPassword",
    "currentPassword",
  ].includes(name);

  const getAutoCompleteValue = () => {
    switch (name) {
      case "email":
        return "email";
      case "username":
        return "username";
      case "password":
        return "current-password";
      case "newPassword":
      case "confirmPassword":
        return "new-password";
      default:
        return "off";
    }
  };

  return (
    <div className="my-4 relative">
      <label
        htmlFor={name}
        className="block text-gray-600 dark:text-gray-300 font-medium mb-2"
      >
        {label} <span className="text-red-600">*</span>
      </label>

      <div className="relative">
        <input
          id={name}
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          autoComplete={getAutoCompleteValue()}
          disabled={disabled}
          className="w-full p-3 bg-gray-50/50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-[#00f0ff] dark:focus:ring-[#00f0ff]/50 disabled:bg-gray-200 dark:disabled:bg-gray-700/50 disabled:cursor-not-allowed transition-all duration-300 backdrop-blur-sm"
        />

        {isPasswordField && (
          <button
            type="button"
            className="absolute cursor-pointer right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-[#00f0ff] hover:text-[#00d4ff] disabled:cursor-not-allowed font-mono text-xs uppercase tracking-tighter"
            onClick={onTogglePassword}
            disabled={disabled}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        )}
      </div>
    </div>
  );
};

export default InputField;
