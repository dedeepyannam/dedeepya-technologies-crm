const db = require('../config/db');

const STAGE_PROBABILITIES = {
  'New Lead': 20,
  'Contacted': 35,
  'Qualified': 50,
  'Proposal Sent': 70,
  'Negotiation': 85,
  'Won': 100,
  'Lost': 0
};

// @desc    Get all Deals / Pipeline Opportunities
// @route   GET /api/v1/deals
// @access  Private
const getDeals = async (req, res, next) => {
  try {
    const { stage, assigned_to } = req.query;

    let queryText = `
      SELECT d.*, 
             c.name as customer_name,
             COALESCE(l.contact_name, cnt.first_name || ' ' || cnt.last_name) as contact_name,
             u.first_name as assigned_first_name, 
             u.last_name as assigned_last_name
      FROM deals d
      INNER JOIN customers c ON d.customer_id = c.id
      LEFT JOIN leads l ON d.lead_id = l.id
      LEFT JOIN contacts cnt ON c.id = cnt.customer_id AND cnt.is_primary = TRUE
      LEFT JOIN users u ON d.assigned_to = u.id
    `;

    let whereClauses = [];
    let params = [];
    let paramIndex = 1;

    // RBAC scoping
    if (req.user.role === 'Sales Executive') {
      whereClauses.push(`d.assigned_to = $${paramIndex}`);
      params.push(req.user.id);
      paramIndex++;
    } else if (req.user.role === 'Sales Manager') {
      whereClauses.push(`(d.assigned_to IN (SELECT id FROM users WHERE manager_id = $${paramIndex} OR id = $${paramIndex}))`);
      params.push(req.user.id);
      paramIndex++;
    }

    if (stage) {
      whereClauses.push(`d.stage = $${paramIndex}`);
      params.push(stage);
      paramIndex++;
    }

    if (assigned_to) {
      whereClauses.push(`d.assigned_to = $${paramIndex}`);
      params.push(parseInt(assigned_to, 10));
      paramIndex++;
    }

    if (whereClauses.length > 0) {
      queryText += ' WHERE ' + whereClauses.join(' AND ');
    }

    queryText += ' ORDER BY d.id DESC';

    const result = await db.query(queryText, params);

    res.status(200).json({
      success: true,
      count: result.rows.length,
      deals: result.rows
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new Deal
// @route   POST /api/v1/deals
// @access  Private
const createDeal = async (req, res, next) => {
  try {
    const { title, customer_id, lead_id, amount, stage, expected_close_date, assigned_to } = req.body;

    if (!title || !customer_id || !amount) {
      return res.status(400).json({ success: false, error: 'Title, customer ID, and amount are required.' });
    }

    const currentStage = stage || 'New Lead';
    const probability = STAGE_PROBABILITIES[currentStage] !== undefined ? STAGE_PROBABILITIES[currentStage] : 10;
    const dealOwner = assigned_to || req.user.id;

    const result = await db.query(`
      INSERT INTO deals (title, customer_id, lead_id, amount, stage, probability, expected_close_date, assigned_to)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `, [
      title,
      parseInt(customer_id, 10),
      lead_id ? parseInt(lead_id, 10) : null,
      parseFloat(amount),
      currentStage,
      probability,
      expected_close_date || null,
      dealOwner
    ]);

    res.status(201).json({
      success: true,
      message: 'Deal created successfully in pipeline',
      deal: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

const STAGES_ORDER = ['New Lead', 'Contacted', 'Qualified', 'Proposal Sent', 'Negotiation', 'Won', 'Lost'];

// @desc    Update Deal Stage (Kanban Drag and Drop Handler)
// @route   PATCH /api/v1/deals/:id/stage
// @access  Private
const updateDealStage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { stage } = req.body;

    if (STAGE_PROBABILITIES[stage] === undefined) {
      return res.status(400).json({ success: false, error: `Invalid stage '${stage}'.` });
    }

    const currentDealRes = await db.query(`
      SELECT d.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone,
             l.contact_name as lead_contact_name, l.estimated_value
      FROM deals d
      LEFT JOIN customers c ON d.customer_id = c.id
      LEFT JOIN leads l ON d.lead_id = l.id
      WHERE d.id = $1
    `, [id]);

    if (currentDealRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Deal not found.' });
    }
    const currentDeal = currentDealRes.rows[0];
    const currentStage = currentDeal.stage;

    // Transition Validation Rules
    if (currentStage === stage) {
      return res.status(200).json({ success: true, message: `Deal already in ${stage}` });
    }

    if (currentStage === 'Won' || currentStage === 'Lost') {
      return res.status(400).json({ success: false, error: 'Cannot move a deal out of a terminal state (Won/Lost).' });
    }

    const probability = STAGE_PROBABILITIES[stage];

    const result = await db.query(`
      UPDATE deals
      SET stage = $1, probability = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *;
    `, [stage, probability, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Deal not found.' });
    }

    const updatedDeal = result.rows[0];

    // ─────────────────────────────────────────────
    // BUSINESS LOGIC: Deal Won — Auto-create customer, update lead
    // ─────────────────────────────────────────────
    if (stage === 'Won') {
      // 1. Update the related lead status to 'Won'
      if (updatedDeal.lead_id) {
        await db.query(`
          UPDATE leads SET status = 'Won', updated_at = CURRENT_TIMESTAMP WHERE id = $1
        `, [updatedDeal.lead_id]);
      }

      // 2. Check if customer already exists for this deal
      const existingCustomer = await db.query('SELECT id FROM customers WHERE id = $1', [updatedDeal.customer_id]);
      
      // 3. If no customer record exists yet, auto-create one from lead data
      if (existingCustomer.rows.length === 0 && updatedDeal.lead_id) {
        const leadRes = await db.query('SELECT * FROM leads WHERE id = $1', [updatedDeal.lead_id]);
        if (leadRes.rows.length > 0) {
          const lead = leadRes.rows[0];
          await db.query(`
            INSERT INTO customers (name, email, phone, notes, lead_id, owner_id, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING id;
          `, [
            lead.company_name || lead.contact_name,
            lead.email,
            lead.phone,
            `Converted from deal: ${updatedDeal.title}. Value: ₹${Number(updatedDeal.amount).toLocaleString('en-IN')}`,
            lead.id,
            updatedDeal.assigned_to || req.user.id
          ]);
        }
      }

      // 4. Generate Deal Won notification for assigned exec, manager, and admin
      const wonAmount = Number(updatedDeal.amount).toLocaleString('en-IN');
      const notifRecipients = new Set([
        updatedDeal.assigned_to || req.user.id,
        req.user.id,
        1 // Always notify admin (ID: 1)
      ]);

      for (const recipientId of notifRecipients) {
        await db.query(`
          INSERT INTO notifications (user_id, title, message, type, link)
          VALUES ($1, $2, $3, $4, $5);
        `, [
          recipientId,
          `🎉 Deal Won — ${currentDeal.customer_name}`,
          `"${updatedDeal.title}" has been marked as Won! Deal value: ₹${wonAmount}. Customer record updated.`,
          'deal_update',
          '/pipeline'
        ]);
      }

    } else if (stage === 'Lost') {
      // Update lead status to Lost
      if (updatedDeal.lead_id) {
        await db.query(`
          UPDATE leads SET status = 'Lost', updated_at = CURRENT_TIMESTAMP WHERE id = $1
        `, [updatedDeal.lead_id]);
      }

      await db.query(`
        INSERT INTO notifications (user_id, title, message, type, link)
        VALUES ($1, $2, $3, $4, $5);
      `, [
        req.user.id,
        `Deal Lost — ${currentDeal.customer_name}`,
        `"${updatedDeal.title}" has been marked as Lost. Consider re-engagement strategy.`,
        'deal_update',
        '/pipeline'
      ]);

    } else {
      // Notify on significant stage changes
      const significantStages = ['Proposal Sent', 'Negotiation'];
      if (significantStages.includes(stage)) {
        await db.query(`
          INSERT INTO notifications (user_id, title, message, type, link)
          VALUES ($1, $2, $3, $4, $5);
        `, [
          updatedDeal.assigned_to || req.user.id,
          `Deal Moved to ${stage}`,
          `"${updatedDeal.title}" has been moved to the ${stage} stage.`,
          'deal_update',
          '/pipeline'
        ]);
      }
    }

    res.status(200).json({
      success: true,
      message: `Deal stage updated to ${stage}`,
      deal: updatedDeal
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDeals,
  createDeal,
  updateDealStage
};
