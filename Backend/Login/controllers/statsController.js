const { updateLanguageCount } = require('../utils/updateLanguageCount');
const { logUserAction } = require('../utils/useLogger');

async function handleCodeCount(req, res, countType) {
    const { language } = req.body;

    if (!language) {
        return res.status(400).json({ msg: 'No valid language provided' });
    }

    const user = req.user;

    const updated = updateLanguageCount(user, countType, language);
    if (!updated) {
        return res.status(400).json({ msg: 'Unsupported language' });
    }

    await logUserAction(user, 'update');
    await user.save();

    return res.status(204).send();
}

async function runCodeCount(req, res) {
    return handleCodeCount(req, res, 'runCodeCount');
}

async function generateCodeCount(req, res) {
    return handleCodeCount(req, res, 'generateCodeCount');
}

async function refactorCodeCount(req, res) {
    return handleCodeCount(req, res, 'refactorCodeCount');
}

async function sharedLinkCount(req, res) {
    const { shareId, title, expiryTime } = req.body;

    if (!shareId || !title || !expiryTime) {
        return res.status(400).json({
            msg: 'Missing required fields: shareId, title, or expiryTime',
        });
    }

    const user = req.user;
    const expiryMilliseconds = parseInt(expiryTime, 10) * 60 * 1000;
    const expiryDate = new Date(Date.now() + expiryMilliseconds);

    const linkExists = user.sharedLinks.some((link) => link.shareId === shareId);
    if (!linkExists) {
        user.sharedLinks.push({
            shareId,
            title,
            expiryTime: expiryDate,
        });

        await logUserAction(user, 'update');
        await user.save();
    }

    return res.status(204).send();
}

module.exports = {
    runCodeCount,
    generateCodeCount,
    refactorCodeCount,
    sharedLinkCount,
};
