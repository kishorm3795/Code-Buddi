const express = require('express');
const router = express.Router();
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const statsRoutes = require('./statsRoutes');

router.use('/', authRoutes);
router.use('/', userRoutes);
router.use('/', statsRoutes);

module.exports = router;
