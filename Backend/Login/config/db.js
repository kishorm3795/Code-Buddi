const mongoose = require('mongoose');
const MONGO_URI = process.env.MONGO_URI;

async function checkAndConnectDB() {
  if (!MONGO_URI) {
    console.warn('MONGO_URI is not defined. Skipping MongoDB connection.');
    return;
  }
  if (mongoose.connection.readyState === 0) {
    try {
      await mongoose.connect(MONGO_URI);
      console.log('MongoDB connected');
    } catch (err) {
      console.error('Error connecting to MongoDB:', err.message);
    }
  }
}

module.exports = { checkAndConnectDB };
