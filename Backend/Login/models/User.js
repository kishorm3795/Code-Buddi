const mongoose = require('mongoose');
const { logUserAction } = require('../utils/useLogger');
const { DEFAULT_LANGUAGE_COUNTS } = require('../config/constants');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 5,
        maxlength: 30,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        match: [/^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/, 'Please provide a valid email address'],
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true,
    },
    password: {
        type: String,
    },
    tokenVersion: {
        type: Number,
        default: 0,
    },
    lastLogin: {
        type: Date,
        default: null,
    },
    createdDate: {
        type: Date,
        default: Date.now,
    },
    isEmailVerified: {
        type: Boolean,
        default: false,
    },
    otp: {
        type: String,
        default: null,
    },
    otpExpires: {
        type: Date,
        default: null,
    },
    otpAttempts: {
        type: Number,
        default: 0,
    },
    generateCodeCount: {
        type: Map,
        of: Number,
        default: () => ({ ...DEFAULT_LANGUAGE_COUNTS }),
    },
    refactorCodeCount: {
        type: Map,
        of: Number,
        default: () => ({ ...DEFAULT_LANGUAGE_COUNTS }),
    },
    runCodeCount: {
        type: Map,
        of: Number,
        default: () => ({ ...DEFAULT_LANGUAGE_COUNTS }),
    },
    sharedLinks: {
        type: [{
            shareId: {
                type: String,
                required: true,
            },
            title: {
                type: String,
                required: true,
            },
            expiryTime: {
                type: Date,
                required: true,
            },
        }],
        default: [],
    },
});

// TTL Index: Automatically remove unverified users whose OTP has expired
userSchema.index(
    { otpExpires: 1 },
    {
        expireAfterSeconds: 0,
        partialFilterExpression: { isEmailVerified: false, otpExpires: { $exists: true } },
    }
);

userSchema.pre('save', async function() {
    const user = this;
    const actionType = user.isNew ? 'create' : 'update';
    try {
        await logUserAction(user, actionType);
    } catch (err) {
        console.error('Error in pre-save logUserAction:', err);
    }
});

// Replace deprecated remove hook with deleteOne
userSchema.pre('deleteOne', { document: true, query: false }, async function() {
    const user = this;
    try {
        await logUserAction(user, 'delete');
    } catch (err) {
        console.error('Error in deleteOne logUserAction:', err);
    }
});

module.exports = mongoose.model('User', userSchema);
