const express = require('express');
const { getUsers, createUser, toggleUserStatus } = require('../controllers/userController');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

router.get('/', getUsers);
router.post('/', requireRole('Admin'), createUser);
router.patch('/:id/status', requireRole('Admin'), toggleUserStatus);

module.exports = router;
