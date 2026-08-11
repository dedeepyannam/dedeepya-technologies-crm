const express = require('express');
const router = express.Router();
const { getReports } = require('../controllers/reportController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', getReports);

module.exports = router;
