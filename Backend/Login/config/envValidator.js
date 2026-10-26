/**
 * Startup Environment Validator for Login Service
 * Validates presence of critical environment variables and warns about missing optional ones.
 */
function validateEnv(logger = console) {
    if (process.env.NODE_ENV === 'test') {
        return { isValid: true, missingRequired: [], missingOptional: [] };
    }

    const required = [
        'JWT_SECRET',
        'MONGO_URI',
        'RECAPTCHA_SECRET_KEY',
        'ALLOWED_ORIGINS',
    ];

    const optional = [
        'GOOGLE_CLIENT_ID',
        'OTP_EMAIL_USER',
        'OTP_EMAIL_PASS',
        'OTP_EMAIL_SERVICE',
        'PORT',
    ];

    const missingRequired = required.filter(
        (key) => !process.env[key] || process.env[key].trim() === ''
    );
    const missingOptional = optional.filter(
        (key) => !process.env[key] || process.env[key].trim() === ''
    );

    if (missingOptional.length > 0) {
        logger.warn(
            `[Login Service] Optional environment variables not set: ${missingOptional.join(', ')}`
        );
    }

    if (missingRequired.length > 0) {
        const errorMsg = `[Login Service] ❌ Missing required environment variables:\n  - ${missingRequired.join('\n  - ')}`;
        logger.error(errorMsg);

        if (process.env.NODE_ENV === 'production') {
            logger.error('[Login Service] FATAL: Production startup aborted due to missing variables.');
            process.exit(1);
        } else {
            logger.warn('[Login Service] ⚠️ Running in development with missing required variables. Dependent endpoints will fail.');
        }
        return { isValid: false, missingRequired, missingOptional };
    }

    logger.info('[Login Service] ✅ Environment variables validated successfully.');
    return { isValid: true, missingRequired: [], missingOptional };
}

module.exports = { validateEnv };
