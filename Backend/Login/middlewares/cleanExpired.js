// Deprecated: Cleanup is now handled automatically by MongoDB TTL index on User.otpExpires
function cleanExpired(req, res, next) {
	next();
}

module.exports = { cleanExpired };
