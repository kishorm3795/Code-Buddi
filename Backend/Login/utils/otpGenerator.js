const crypto = require('node:crypto');

function generateOtp() {
  return crypto.randomInt(100000, 1000000).toString();
}

module.exports = { generateOtp };
