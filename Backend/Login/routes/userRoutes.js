const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { requireAuth } = require('../middlewares/auth');
const { verifyRecaptcha } = require('../middlewares/verifyRecaptcha');

router.get('/protected', requireAuth, userController.getProtected);
router.post('/account-details', requireAuth, verifyRecaptcha, userController.getAccountDetails);
router.put('/change-username', requireAuth, verifyRecaptcha, userController.changeUsername);
router.put('/change-password', requireAuth, verifyRecaptcha, userController.changePassword);
router.delete('/account', requireAuth, verifyRecaptcha, userController.deleteAccount);
router.post('/verify-password', requireAuth, verifyRecaptcha, userController.verifyPassword);
router.post('/user/sharedLinks', requireAuth, userController.getUserSharedLinks);

// Requirement 1: Auth required, uses token userId, only deletes user's own link
router.delete('/sharedLink', requireAuth, verifyRecaptcha, userController.deleteSharedLinkFromBody);
router.delete('/user/sharedLink/:shareId', requireAuth, verifyRecaptcha, userController.deleteSharedLinkFromParams);

module.exports = router;
