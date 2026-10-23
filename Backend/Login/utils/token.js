const jwt = require('jsonwebtoken');

function signToken(userId, tokenVersion = 0, expiresIn = '7d') {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not defined');
  }
  return jwt.sign(
    { userId, tokenVersion },
    process.env.JWT_SECRET,
    {
      algorithm: 'HS512',
      expiresIn,
    }
  );
}

// Backward-compatible alias
function generateToken(userId, expiresIn = '7d') {
  return signToken(userId, 0, expiresIn);
}

module.exports = { signToken, generateToken };
