const { LANGUAGE_KEY_MAP } = require('../config/constants');

const updateLanguageCount = (user, countType, language) => {
    const langKey = LANGUAGE_KEY_MAP[language];
    if (!langKey) {
        return false;
    }
    const current = user[countType].get(langKey) || 0;
    user[countType].set(langKey, current + 1);
    return true;
};

module.exports = { updateLanguageCount };
