const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');
const { requireAuth } = require('../middlewares/auth');
const { verifyRecaptcha } = require('../middlewares/verifyRecaptcha');

// Requirement 1: Add authentication to POST /api/runCode/count
router.post('/runCode/count', requireAuth, verifyRecaptcha, statsController.runCodeCount);
router.post('/generateCode/count', requireAuth, verifyRecaptcha, statsController.generateCodeCount);
router.post('/refactorCode/count', requireAuth, verifyRecaptcha, statsController.refactorCodeCount);
router.post('/sharedLink/count', requireAuth, verifyRecaptcha, statsController.sharedLinkCount);

module.exports = router;
