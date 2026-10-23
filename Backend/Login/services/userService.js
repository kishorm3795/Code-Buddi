const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { logUserAction } = require('../utils/useLogger');

async function removeSharedLink(userId, shareId) {
    const user = await User.findById(userId);
    if (!user) {
        return { success: false, status: 404, msg: 'User not found' };
    }

    const linkIndex = user.sharedLinks.findIndex((link) => link.shareId === shareId);
    if (linkIndex === -1) {
        return { success: false, status: 404, msg: 'Shared link not found' };
    }

    user.sharedLinks.splice(linkIndex, 1);
    await logUserAction(user, 'update');
    await user.save();

    return { success: true, status: 200, msg: 'Shared link deleted successfully' };
}

async function changeUserPassword(user, newPassword) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    user.tokenVersion = (user.tokenVersion || 0) + 1; // Invalidate all prior tokens
    await user.save();
    return user;
}

module.exports = {
    removeSharedLink,
    changeUserPassword,
};
