const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { usernameRegex, pwdRegex, reservedUsernames } = require('../utils/validation');
const { logUserAction } = require('../utils/useLogger');
const { sendDelEmail } = require('../smtp/delEmail');
const { sendPassChangeEmail } = require('../smtp/passChanged');
const { sendUsernameChangeEmail } = require('../smtp/usernameChanged');
const { removeSharedLink, changeUserPassword } = require('../services/userService');
const { clearTokenCookie } = require('../services/authService');

async function getProtected(req, res) {
    const user = req.user;
    return res.status(200).json({
        user: {
            username: user.username,
            email: user.email,
        },
    });
}

async function getAccountDetails(req, res) {
    const user = req.user;
    const isGoogleUser = !!(user.googleId && !user.password);

    return res.status(200).json({
        user: {
            id: user._id,
            username: user.username,
            email: user.email,
            isgoogleuser: isGoogleUser,
            createdDate: user.createdDate,
            lastLogin: user.lastLogin,
            generateCodeCount: user.generateCodeCount,
            refactorCodeCount: user.refactorCodeCount,
            runCodeCount: user.runCodeCount,
            sharedLinks: user.sharedLinks,
        },
    });
}

async function changeUsername(req, res) {
    const { newUsername } = req.body;
    const user = req.user;

    if (!newUsername || !usernameRegex.test(newUsername)) {
        return res.status(400).json({
            msg: 'Username must be 5-30 characters long and can only contain letters, numbers, underscores, dots, and hyphens.',
        });
    }

    if (reservedUsernames.includes(newUsername.toLowerCase())) {
        return res.status(400).json({ msg: 'This username is reserved. Please choose another one.' });
    }

    if (user.username === newUsername) {
        return res.status(400).json({ msg: 'New username must be different from the current username' });
    }

    try {
        const existing = await User.findOne({ username: newUsername });
        if (existing) {
            return res.status(400).json({ msg: 'Username is already taken' });
        }

        const oldUsername = user.username;
        user.username = newUsername;
        await logUserAction(user, 'update');
        await user.save();

        try {
            await sendUsernameChangeEmail(user.email, oldUsername, newUsername);
        } catch (emailErr) {
            console.error('Failed to send username change email:', emailErr);
        }

        return res.status(200).json({
            msg: 'Username updated successfully',
            username: user.username,
        });
    } catch (err) {
        console.error('Change username error:', err);
        return res.status(500).json({ msg: 'Server error' });
    }
}

async function changePassword(req, res) {
    const { currentPassword, newPassword } = req.body;
    const user = req.user;

    if (!newPassword || newPassword.length < 8 || !pwdRegex.test(newPassword)) {
        return res.status(400).json({
            msg: 'Password must be at least 8 characters and contain only ASCII characters.',
        });
    }

    try {
        // If user has a password, verify current password
        if (user.password) {
            if (!currentPassword) {
                return res.status(400).json({ msg: 'Current password is required' });
            }
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) {
                return res.status(400).json({ msg: 'Current password is incorrect' });
            }
        }

        await changeUserPassword(user, newPassword);

        try {
            await sendPassChangeEmail(user.email);
        } catch (mailErr) {
            console.error('Failed to send pass change email:', mailErr);
        }

        return res.status(200).json({ msg: 'Password changed successfully' });
    } catch (err) {
        console.error('Change password error:', err);
        return res.status(500).json({ msg: 'Server error' });
    }
}

async function deleteAccount(req, res) {
    const { password } = req.body;
    const user = req.user;

    try {
        if (user.password) {
            if (!password) {
                return res.status(400).json({ msg: 'Password is required to delete account' });
            }
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(400).json({ msg: 'Incorrect password' });
            }
        }

        const email = user.email;
        await User.deleteOne({ _id: user._id });

        try {
            await sendDelEmail(email);
        } catch (mailErr) {
            console.error('Failed to send deletion email:', mailErr);
        }

        clearTokenCookie(res);
        return res.status(200).json({ msg: 'Account deleted successfully' });
    } catch (err) {
        console.error('Delete account error:', err);
        return res.status(500).json({ msg: 'Server error' });
    }
}

async function verifyPassword(req, res) {
    const { password } = req.body;
    const user = req.user;

    if (!password) {
        return res.status(400).json({ msg: 'Password is required' });
    }

    try {
        if (!user.password) {
            return res.status(400).json({ msg: 'No password set for this account' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Incorrect password' });
        }

        return res.status(200).json({ msg: 'Password verified successfully' });
    } catch (err) {
        return res.status(500).json({ msg: 'Server error' });
    }
}

async function getUserSharedLinks(req, res) {
    const user = req.user;
    return res.status(200).json({
        sharedLinks: user.sharedLinks || [],
    });
}

async function deleteSharedLinkFromBody(req, res) {
    const { shareId } = req.body;
    if (!shareId) {
        return res.status(400).json({ msg: 'ShareId is required' });
    }

    const result = await removeSharedLink(req.userId, shareId);
    return res.status(result.status).json({ msg: result.msg });
}

async function deleteSharedLinkFromParams(req, res) {
    const { shareId } = req.params;
    if (!shareId) {
        return res.status(400).json({ msg: 'ShareId parameter is required' });
    }

    const result = await removeSharedLink(req.userId, shareId);
    return res.status(result.status).json({ msg: result.msg });
}

module.exports = {
    getProtected,
    getAccountDetails,
    changeUsername,
    changePassword,
    deleteAccount,
    verifyPassword,
    getUserSharedLinks,
    deleteSharedLinkFromBody,
    deleteSharedLinkFromParams,
};
