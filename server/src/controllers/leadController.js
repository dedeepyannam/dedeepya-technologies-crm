const db = require('../config/db');

// Map API uppercase exact status to Database ENUM status
const statusMap = {
  'NEW': 'New Lead',
  'CONTACTED': 'Contacted',
  'QUALIFIED': 'Qualified',
  'PROPOSAL_SENT': 'Proposal Sent',
  'NEGOTIATION': 'Negotiation',
  'WON': 'Won',
  'LOST': 'Lost'
};

const reverseStatusMap = Object.entries(statusMap).reduce((acc, [k, v]) => ({ ...acc, [v]: k }), {});

// Helper to map DB row to API response
const formatLead = (dbLead) => ({
  lead_id: dbLead.id,
  name: dbLead.contact_name,
  company: dbLead.company_name,
  email: dbLead.email,
  phone: dbLead.phone,
  source: dbLead.source,
  status: reverseStatusMap[dbLead.status] || dbLead.status,
  assigned_to: dbLead.assigned_to,
  assigned_first_name: dbLead.assigned_first_name,
  assigned_last_name: dbLead.assigned_last_name,
  created_at: dbLead.created_at,
  updated_at: dbLead.updated_at
});

// Helper for RBAC lead filtering
const buildRoleWhereClause = (reqUser, startIndex = 1) => {
  if (reqUser.role === 'Admin') {
    return { clause: 'WHERE 1=1', params: [] };
  } else if (reqUser.role === 'Sales Manager') {
    return {
      clause: `WHERE (l.assigned_to IN (SELECT id FROM users WHERE manager_id = $${startIndex} OR id = $${startIndex}))`,
      params: [reqUser.id]
    };
  } else {
    return {
      clause: `WHERE l.assigned_to = $${startIndex}`,
      params: [reqUser.id]
    };
  }
};

// @desc    Get all leads with filters & RBAC
// @route   GET /api/leads
// @access  Private
const getLeads = async (req, res, next) => {
  try {
    const { status, search, assigned_to, page = 1, limit = 10 } = req.query;

    let queryText = `
      SELECT l.*, 
             u.first_name as assigned_first_name, 
             u.last_name as assigned_last_name
      FROM leads l
      LEFT JOIN users u ON l.assigned_to = u.id
    `;

    const roleScope = buildRoleWhereClause(req.user, 1);
    let whereClauses = [roleScope.clause.replace('WHERE ', '')];
    let params = [...roleScope.params];
    let paramIndex = params.length + 1;

    if (status && statusMap[status]) {
      whereClauses.push(`l.status = $${paramIndex}`);
      params.push(statusMap[status]);
      paramIndex++;
    }

    if (assigned_to) {
      whereClauses.push(`l.assigned_to = $${paramIndex}`);
      params.push(parseInt(assigned_to, 10));
      paramIndex++;
    }

    if (search) {
      whereClauses.push(`(l.title ILIKE $${paramIndex} OR l.company_name ILIKE $${paramIndex} OR l.contact_name ILIKE $${paramIndex} OR l.email ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    queryText += ' WHERE ' + whereClauses.join(' AND ') + ' ORDER BY l.id DESC';
    
    // Pagination
    const offset = (page - 1) * limit;
    queryText += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit, 10), offset);

    const result = await db.query(queryText, params);
    
    // Also get total count for pagination
    const countQuery = 'SELECT COUNT(*) FROM leads l WHERE ' + whereClauses.join(' AND ');
    const countResult = await db.query(countQuery, params.slice(0, paramIndex - 1));

    res.status(200).json({
      success: true,
      count: result.rows.length,
      total: parseInt(countResult.rows[0].count, 10),
      page: parseInt(page, 10),
      totalPages: Math.ceil(parseInt(countResult.rows[0].count, 10) / limit),
      leads: result.rows.map(formatLead)
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new Lead
// @route   POST /api/leads
// @access  Private
const createLead = async (req, res, next) => {
  try {
    const { name, company, email, phone, source, status, assigned_to } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        error: 'Name and email are required fields.'
      });
    }

    // Email validation regex
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ success: false, error: 'Invalid email format.' });
    }
    
    // Prevent duplicates by email
    const existing = await db.query('SELECT id FROM leads WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'A lead with this email already exists.' });
    }

    const targetAssigned = assigned_to || req.user.id;
    const dbStatus = statusMap[status] || 'New Lead';
    const title = company ? `${company} Lead` : `${name} Lead`;

    const result = await db.query(`
      INSERT INTO leads (title, company_name, contact_name, email, phone, source, status, assigned_to)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `, [
      title,
      company || '',
      name,
      email,
      phone || '',
      source || 'Direct',
      dbStatus,
      targetAssigned
    ]);

    if (targetAssigned !== req.user.id) {
      await db.query(`
        INSERT INTO notifications (user_id, title, message, type, link)
        VALUES ($1, $2, $3, $4, $5);
      `, [
        targetAssigned,
        'New Lead Assigned',
        `You have been assigned lead "${name}".`,
        'lead_assignment',
        '/leads'
      ]);
    }

    res.status(201).json({
      success: true,
      message: 'Lead created successfully',
      lead: formatLead(result.rows[0])
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Lead by ID
// @route   GET /api/leads/:id
// @access  Private
const getLeadById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const leadRes = await db.query(`
      SELECT l.*, u.first_name as assigned_first_name, u.last_name as assigned_last_name
      FROM leads l
      LEFT JOIN users u ON l.assigned_to = u.id
      WHERE l.id = $1;
    `, [id]);

    if (leadRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Lead not found.' });
    }

    res.status(200).json({
      success: true,
      lead: formatLead(leadRes.rows[0])
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Lead completely
// @route   PUT /api/leads/:id
// @access  Private
const updateLead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, company, email, phone, source, status, assigned_to } = req.body;

    const existingLead = await db.query('SELECT * FROM leads WHERE id = $1', [id]);
    if (existingLead.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Lead not found.' });
    }

    if (email && existingLead.rows[0].email !== email) {
      const emailCheck = await db.query('SELECT id FROM leads WHERE email = $1', [email]);
      if (emailCheck.rows.length > 0) {
         return res.status(400).json({ success: false, error: 'Another lead with this email already exists.' });
      }
    }

    const title = company ? `${company} Lead` : `${name || existingLead.rows[0].contact_name} Lead`;
    const dbStatus = statusMap[status] || existingLead.rows[0].status;

    const result = await db.query(`
      UPDATE leads
      SET 
        title = COALESCE($1, title),
        company_name = COALESCE($2, company_name),
        contact_name = COALESCE($3, contact_name),
        email = COALESCE($4, email),
        phone = COALESCE($5, phone),
        source = COALESCE($6, source),
        status = COALESCE($7, status),
        assigned_to = COALESCE($8, assigned_to),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING *;
    `, [
      title,
      company,
      name,
      email,
      phone,
      source,
      dbStatus,
      assigned_to,
      id
    ]);

    res.status(200).json({
      success: true,
      message: 'Lead updated successfully',
      lead: formatLead(result.rows[0])
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete Lead
// @route   DELETE /api/leads/:id
// @access  Private
const deleteLead = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existingLead = await db.query('SELECT * FROM leads WHERE id = $1', [id]);
    if (existingLead.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Lead not found.' });
    }

    // Role check: Only Admin or the owner can delete
    if (req.user.role !== 'Admin' && existingLead.rows[0].assigned_to !== req.user.id) {
       return res.status(403).json({ success: false, error: 'Forbidden. You do not have permission to delete this lead.' });
    }

    await db.query('DELETE FROM leads WHERE id = $1', [id]);

    res.status(200).json({
      success: true,
      message: 'Lead deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
};

// Keep existing routes for backward compatibility temporarily if needed by other components
const updateLeadStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Accept either API or DB status
    const dbStatus = statusMap[status] || status;
    const validDbStatuses = Object.values(statusMap);
    if (!validDbStatuses.includes(dbStatus)) {
      return res.status(400).json({ success: false, error: 'Invalid lead status.' });
    }

    const result = await db.query('UPDATE leads SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *', [dbStatus, id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Lead not found.' });
    res.status(200).json({ success: true, lead: formatLead(result.rows[0]) });
  } catch (err) { next(err); }
};

const convertLead = async (req, res, next) => {
  // Keeping this function as it is important for CRM flow
  try {
    const { id } = req.params;
    const leadRes = await db.query('SELECT * FROM leads WHERE id = $1', [id]);
    if (leadRes.rows.length === 0) return res.status(404).json({ success: false, error: 'Lead not found.' });
    const lead = leadRes.rows[0];
    if (lead.converted_customer_id) return res.status(400).json({ success: false, error: 'Already converted.' });

    // Check for duplicate customer email
    if (lead.email) {
      const existingCust = await db.query('SELECT id FROM customers WHERE email = $1', [lead.email]);
      if (existingCust.rows.length > 0) {
        return res.status(400).json({ success: false, error: "A customer with this lead's email already exists. Cannot convert." });
      }
    }

    const companyName = lead.company_name || `${lead.contact_name} Account`;
    const customerRes = await db.query(`INSERT INTO customers (name, email, phone, owner_id, lead_id) VALUES ($1, $2, $3, $4, $5) RETURNING *`, [companyName, lead.email, lead.phone, lead.assigned_to, lead.id]);
    const customer = customerRes.rows[0];

    const nameParts = lead.contact_name.split(' ');
    const firstName = nameParts[0] || 'Primary';
    const lastName = nameParts.slice(1).join(' ') || 'Contact';
    await db.query(`INSERT INTO contacts (customer_id, first_name, last_name, email, phone, is_primary) VALUES ($1, $2, $3, $4, $5, true)`, [customer.id, firstName, lastName, lead.email, lead.phone]);
    
    const dealTitle = `${companyName} - ${lead.title}`;
    const dealRes = await db.query(`INSERT INTO deals (title, customer_id, lead_id, amount, stage, probability, assigned_to) VALUES ($1, $2, $3, $4, 'Qualified', 50, $5) RETURNING *`, [dealTitle, customer.id, lead.id, lead.estimated_value, lead.assigned_to]);

    await db.query(`UPDATE leads SET status = 'Won', converted_customer_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [customer.id, lead.id]);
    res.status(200).json({ success: true, customer, deal: dealRes.rows[0] });
  } catch (err) { next(err); }
};

module.exports = {
  getLeads,
  createLead,
  getLeadById,
  updateLead,
  deleteLead,
  updateLeadStatus,
  convertLead
};
