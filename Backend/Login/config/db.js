const mongoose = require('mongoose');

async function connectDB() {
    const MONGO_URI = process.env.MONGO_URI;
    if (!MONGO_URI) {
        if (process.env.NODE_ENV === 'test') {
            return;
        }
        console.error('FATAL: MONGO_URI environment variable is not defined.');
        process.exit(1);
    }

    try {
        await mongoose.connect(MONGO_URI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        console.log('MongoDB connected successfully');
    } catch (err) {
        console.error('FATAL: Error connecting to MongoDB:', err.message);
        if (process.env.NODE_ENV !== 'test') {
            process.exit(1);
        }
        throw err;
    }
}

module.exports = { connectDB };
