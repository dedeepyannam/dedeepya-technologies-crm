const express = require('express');
const { getDeals, createDeal, updateDealStage } = require('../controllers/dealController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

router.get('/', getDeals);
router.post('/', createDeal);
router.patch('/:id/stage', updateDealStage);

module.exports = router;
