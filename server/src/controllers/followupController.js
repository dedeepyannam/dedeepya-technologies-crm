const db = require('../config/db');

// @desc    Get Activity / Follow-up Logs
// @route   GET /api/v1/followups
// @access  Private
const getFollowups = async (req, res, next) => {
  try {
    const { type, lead_id, deal_id, customer_id } = req.query;

    let queryText = `
      SELECT f.*, 
             u.first_name as user_first_name, 
             u.last_name as user_last_name,
             l.title as lead_title,
             d.title as deal_title,
             c.name as customer_name
      FROM follow_ups f
      LEFT JOIN users u ON f.user_id = u.id
      LEFT JOIN leads l ON f.lead_id = l.id
      LEFT JOIN deals d ON f.deal_id = d.id
      LEFT JOIN customers c ON f.customer_id = c.id
    `;

    let whereClauses = [];
    let params = [];
    let paramIndex = 1;

    if (type) {
      whereClauses.push(`f.type = $${paramIndex}`);
      params.push(type);
      paramIndex++;
    }

    if (lead_id) {
      whereClauses.push(`f.lead_id = $${paramIndex}`);
      params.push(parseInt(lead_id, 10));
      paramIndex++;
    }

    if (deal_id) {
      whereClauses.push(`f.deal_id = $${paramIndex}`);
      params.push(parseInt(deal_id, 10));
      paramIndex++;
    }

    if (customer_id) {
      whereClauses.push(`f.customer_id = $${paramIndex}`);
      params.push(parseInt(customer_id, 10));
      paramIndex++;
    }

    if (whereClauses.length > 0) {
      queryText += ' WHERE ' + whereClauses.join(' AND ');
    }

    queryText += ' ORDER BY f.follow_up_date DESC';

    const result = await db.query(queryText, params);

    res.status(200).json({
      success: true,
      count: result.rows.length,
      followups: result.rows
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Log a new Activity / Follow-up
// @route   POST /api/v1/followups
// @access  Private
const createFollowup = async (req, res, next) => {
  try {
    const { title, type, notes, follow_up_date, lead_id, deal_id, customer_id, next_followup_date } = req.body;

    if (!title || !type) {
      return res.status(400).json({ success: false, error: 'Title and activity type are required.' });
    }

    const result = await db.query(`
      INSERT INTO follow_ups (title, type, notes, follow_up_date, user_id, lead_id, deal_id, customer_id, next_followup_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `, [
      title,
      type,
      notes || '',
      follow_up_date || new Date().toISOString(),
      req.user.id,
      lead_id ? parseInt(lead_id, 10) : null,
      deal_id ? parseInt(deal_id, 10) : null,
      customer_id ? parseInt(customer_id, 10) : null,
      next_followup_date || null
    ]);

    res.status(201).json({
      success: true,
      message: 'Activity logged successfully',
      followup: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getFollowups,
  createFollowup
};
