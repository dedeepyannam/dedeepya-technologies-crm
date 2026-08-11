const express = require('express');
const { getLeads, createLead, getLeadById, updateLeadStatus, convertLead, updateLead, deleteLead } = require('../controllers/leadController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

router.get('/', getLeads);
router.post('/', createLead);
router.get('/:id', getLeadById);
router.put('/:id', updateLead);
router.delete('/:id', deleteLead);
router.patch('/:id/status', updateLeadStatus);
router.post('/:id/convert', convertLead);

module.exports = router;
