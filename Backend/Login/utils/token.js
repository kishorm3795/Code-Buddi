const jwt = require('jsonwebtoken');

function generateToken(userId, expiresIn = '7d') {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not defined');
  }
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    {
      algorithm: 'HS512',
      expiresIn,
    }
  );
}

module.exports = { generateToken };
