const bcrypt = require('bcryptjs');
const db = require('../config/db');

// @desc    Get all users (Filtered by RBAC)
// @route   GET /api/v1/users
// @access  Private (Admin / Sales Manager)
const getUsers = async (req, res, next) => {
  try {
    let queryText = 'SELECT id, first_name, last_name, email, role, phone, manager_id, is_active, created_at FROM users';
    let params = [];

    // Sales Manager can see self & managed team members
    if (req.user.role === 'Sales Manager') {
      queryText += ' WHERE manager_id = $1 OR id = $1';
      params.push(req.user.id);
    } else if (req.user.role === 'Sales Executive') {
      queryText += ' WHERE id = $1';
      params.push(req.user.id);
    }

    queryText += ' ORDER BY id ASC';

    const result = await db.query(queryText, params);

    res.status(200).json({
      success: true,
      count: result.rows.length,
      users: result.rows
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new User
// @route   POST /api/v1/users
// @access  Private (Admin only)
const createUser = async (req, res, next) => {
  try {
    const { first_name, last_name, email, password, role, manager_id, phone } = req.body;

    if (!first_name || !last_name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'First name, last name, email, and password are required.'
      });
    }

    // Check duplicate
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, error: 'User with this email already exists.' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const result = await db.query(`
      INSERT INTO users (first_name, last_name, email, password_hash, role, manager_id, phone)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, first_name, last_name, email, role, phone, manager_id, is_active, created_at;
    `, [first_name, last_name, email, password_hash, role || 'Sales Executive', manager_id || null, phone || null]);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle User Active Status
// @route   PATCH /api/v1/users/:id/status
// @access  Private (Admin only)
const toggleUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    const result = await db.query(
      'UPDATE users SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, email, is_active',
      [is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    res.status(200).json({
      success: true,
      message: `User status updated to ${is_active ? 'Active' : 'Deactivated'}`,
      user: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  createUser,
  toggleUserStatus
};
