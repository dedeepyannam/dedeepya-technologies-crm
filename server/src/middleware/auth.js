const jwt = require('jsonwebtoken');
const db = require('../config/db');

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication failed. Access token is missing.'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'crm_super_secret_jwt_key_2026_enterprise_production', (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        error: 'Invalid or expired access token.'
      });
    }
    req.user = user;
    next();
  });
};

// Middleware to enforce minimum Role requirements (Admin, Sales Manager, Sales Executive)
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Forbidden. Role '${req.user.role}' does not have sufficient permissions.`
      });
    }
    next();
  };
};

module.exports = {
  authenticateToken,
  requireRole
};
