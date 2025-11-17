const express = require('express');
const healthController = require('../controllers/healthController');
const historyRoutes = require('./historyRoutes');

const router = express.Router();

router.get('/health', healthController.healthCheck);
router.use('/history', historyRoutes);

module.exports = router;

