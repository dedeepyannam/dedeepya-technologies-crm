const express = require('express');
const { getKpis, getPipelineStageDistribution, getAnalyticsData } = require('../controllers/dashboardController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

router.get('/kpis', getKpis);
router.get('/pipeline-stages', getPipelineStageDistribution);
router.get('/analytics', getAnalyticsData);

module.exports = router;
