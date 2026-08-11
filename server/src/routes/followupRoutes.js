const express = require('express');
const router = express.Router();
const { getFollowups, createFollowup } = require('../controllers/followupController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.route('/')
  .get(getFollowups)
  .post(createFollowup);

module.exports = router;
