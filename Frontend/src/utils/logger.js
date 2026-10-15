/**
 * Structured logging utility for frontend application
 * Provides JSON-formatted logging for production readiness
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

// Get log level from environment or default to INFO in production, DEBUG in development
const getLogLevel = () => {
  if (import.meta.env.MODE === 'production') {
    return import.meta.env.VITE_LOG_LEVEL || LOG_LEVELS.INFO;
  }
  return import.meta.env.VITE_LOG_LEVEL || LOG_LEVELS.DEBUG;
};

const LOG_LEVEL = getLogLevel();

/**
 * Format log entry as JSON string
 * @param {string} level - Log level (debug, info, warn, error)
 * @param {string} message - Log message
 * @param {Object} meta - Additional metadata to include in log
 * @returns {string} JSON-formatted log entry
 */
const formatLogEntry = (level, message, meta = {}) => {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    service: 'frontend',
    ...meta
  };
  return JSON.stringify(entry);
};

/**
 * Log a debug message
 * @param {string} message - Log message
 * @param {Object} meta - Additional metadata
 */
export const debug = (message, meta = {}) => {
  if (LOG_LEVEL <= LOG_LEVELS.DEBUG) {
    console.debug(formatLogEntry('debug', message, meta));
  }
};

/**
 * Log an info message
 * @param {string} message - Log message
 * @param {Object} meta - Additional metadata
 */
export const info = (message, meta = {}) => {
  if (LOG_LEVEL <= LOG_LEVELS.INFO) {
    console.info(formatLogEntry('info', message, meta));
  }
};

/**
 * Log a warning message
 * @param {string} message - Log message
 * @param {Object} meta - Additional metadata
 */
export const warn = (message, meta = {}) => {
  if (LOG_LEVEL <= LOG_LEVELS.WARN) {
    console.warn(formatLogEntry('warn', message, meta));
  }
};

/**
 * Log an error message
 * @param {string} message - Log message
 * @param {Object} meta - Additional metadata
 */
export const error = (message, meta = {}) => {
  if (LOG_LEVEL <= LOG_LEVELS.ERROR) {
    console.error(formatLogEntry('error', message, meta));
  }
};

export default { debug, info, warn, error };
