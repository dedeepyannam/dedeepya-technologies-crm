const db = require('../config/db');

// Helper to map DB rows to API response
const formatCustomer = (dbCustomer, primaryContact) => ({
  customer_id: dbCustomer.id,
  lead_id: dbCustomer.lead_id || null,
  name: primaryContact ? `${primaryContact.first_name} ${primaryContact.last_name}`.trim() : '',
  company: dbCustomer.name,
  email: dbCustomer.email || (primaryContact && primaryContact.email) || '',
  phone: dbCustomer.phone || (primaryContact && primaryContact.phone) || '',
  address: [dbCustomer.address, dbCustomer.city, dbCustomer.country].filter(Boolean).join(', '),
  notes: dbCustomer.notes || '',
  owner_first_name: dbCustomer.owner_first_name,
  owner_last_name: dbCustomer.owner_last_name,
  created_at: dbCustomer.created_at,
  updated_at: dbCustomer.updated_at
});

// @desc    Get all Customer Accounts
// @route   GET /api/v1/customers
// @access  Private
const getCustomers = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;

    let queryText = `
      SELECT c.*, 
             u.first_name as owner_first_name, 
             u.last_name as owner_last_name,
             pc.first_name as contact_first,
             pc.last_name as contact_last,
             pc.email as contact_email,
             pc.phone as contact_phone
      FROM customers c
      LEFT JOIN users u ON c.owner_id = u.id
      LEFT JOIN contacts pc ON c.id = pc.customer_id AND pc.is_primary = TRUE
    `;

    let whereClauses = [];
    let params = [];
    let paramIndex = 1;

    // Scoping for Sales Executive
    if (req.user.role === 'Sales Executive') {
      whereClauses.push(`c.owner_id = $${paramIndex}`);
      params.push(req.user.id);
      paramIndex++;
    } else if (req.user.role === 'Sales Manager') {
      whereClauses.push(`(c.owner_id IN (SELECT id FROM users WHERE manager_id = $${paramIndex} OR id = $${paramIndex}))`);
      params.push(req.user.id);
      paramIndex++;
    }

    if (search) {
      whereClauses.push(`(c.name ILIKE $${paramIndex} OR c.email ILIKE $${paramIndex} OR pc.first_name ILIKE $${paramIndex} OR pc.last_name ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (whereClauses.length > 0) {
      queryText += ' WHERE ' + whereClauses.join(' AND ');
    }

    queryText += ' ORDER BY c.id DESC';
    
    // Pagination
    const offset = (page - 1) * limit;
    queryText += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit, 10), offset);

    const result = await db.query(queryText, params);
    
    // Total count for pagination
    const countQuery = 'SELECT COUNT(*) FROM customers c LEFT JOIN contacts pc ON c.id = pc.customer_id AND pc.is_primary = TRUE' + (whereClauses.length > 0 ? ' WHERE ' + whereClauses.join(' AND ') : '');
    const countResult = await db.query(countQuery, params.slice(0, paramIndex - 1));

    const formattedCustomers = result.rows.map(row => {
      const contact = {
        first_name: row.contact_first,
        last_name: row.contact_last,
        email: row.contact_email,
        phone: row.contact_phone
      };
      return formatCustomer(row, row.contact_first ? contact : null);
    });

    res.status(200).json({
      success: true,
      count: result.rows.length,
      total: parseInt(countResult.rows[0].count, 10),
      page: parseInt(page, 10),
      totalPages: Math.ceil(parseInt(countResult.rows[0].count, 10) / limit),
      customers: formattedCustomers
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create Customer Account
// @route   POST /api/v1/customers
// @access  Private
const createCustomer = async (req, res, next) => {
  try {
    const { name, company, email, phone, address, notes, lead_id, owner_id } = req.body;

    if (!company) {
      return res.status(400).json({ success: false, error: 'Company name is required.' });
    }

    // Prevent duplicate customers by email
    if (email) {
      const existing = await db.query('SELECT id FROM customers WHERE email = $1', [email]);
      if (existing.rows.length > 0) {
        return res.status(400).json({ success: false, error: 'A customer with this email already exists.' });
      }
    }

    const customerOwner = owner_id || req.user.id;

    // Insert Customer
    const result = await db.query(`
      INSERT INTO customers (name, email, phone, address, notes, lead_id, owner_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `, [
      company,
      email || '',
      phone || '',
      address || '',
      notes || '',
      lead_id || null,
      customerOwner
    ]);

    const customer = result.rows[0];

    // Insert Primary Contact if name is provided
    let primaryContact = null;
    if (name) {
      const nameParts = name.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ');

      const contactRes = await db.query(`
        INSERT INTO contacts (customer_id, first_name, last_name, email, phone, is_primary)
        VALUES ($1, $2, $3, $4, $5, true)
        RETURNING *;
      `, [
        customer.id,
        firstName,
        lastName,
        email || '',
        phone || ''
      ]);
      primaryContact = contactRes.rows[0];
    }

    // Create system notification for new customer
    await db.query(`
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES ($1, $2, $3, $4, $5);
    `, [
      owner_id || req.user.id,
      'New Customer Account',
      `Customer account for "${company}" was successfully created.`,
      'customer_activity',
      '/customers'
    ]);

    res.status(201).json({
      success: true,
      message: 'Customer account created successfully',
      customer: formatCustomer(customer, primaryContact)
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Customer Detail
// @route   GET /api/v1/customers/:id
// @access  Private
const getCustomerById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const customerRes = await db.query(`
      SELECT c.*, u.first_name as owner_first_name, u.last_name as owner_last_name
      FROM customers c
      LEFT JOIN users u ON c.owner_id = u.id
      WHERE c.id = $1;
    `, [id]);

    if (customerRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Customer not found.' });
    }

    const primaryContactRes = await db.query('SELECT * FROM contacts WHERE customer_id = $1 AND is_primary = TRUE LIMIT 1;', [id]);
    
    res.status(200).json({
      success: true,
      customer: formatCustomer(customerRes.rows[0], primaryContactRes.rows[0])
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Customer
// @route   PUT /api/v1/customers/:id
// @access  Private
const updateCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, company, email, phone, address, notes, owner_id } = req.body;

    const existingCustomer = await db.query('SELECT * FROM customers WHERE id = $1', [id]);
    if (existingCustomer.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Customer not found.' });
    }

    if (email && existingCustomer.rows[0].email !== email) {
      const emailCheck = await db.query('SELECT id FROM customers WHERE email = $1', [email]);
      if (emailCheck.rows.length > 0) {
         return res.status(400).json({ success: false, error: 'Another customer with this email already exists.' });
      }
    }

    const result = await db.query(`
      UPDATE customers
      SET 
        name = COALESCE($1, name),
        email = COALESCE($2, email),
        phone = COALESCE($3, phone),
        address = COALESCE($4, address),
        notes = COALESCE($5, notes),
        owner_id = COALESCE($6, owner_id),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *;
    `, [
      company,
      email,
      phone,
      address,
      notes,
      owner_id,
      id
    ]);

    // Update primary contact if name provided
    let primaryContact = null;
    if (name) {
      const nameParts = name.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ');

      const contactCheck = await db.query('SELECT id FROM contacts WHERE customer_id = $1 AND is_primary = TRUE', [id]);
      
      if (contactCheck.rows.length > 0) {
        const contactRes = await db.query(`
          UPDATE contacts
          SET first_name = $1, last_name = $2, email = $3, phone = $4, updated_at = CURRENT_TIMESTAMP
          WHERE id = $5
          RETURNING *;
        `, [firstName, lastName, email, phone, contactCheck.rows[0].id]);
        primaryContact = contactRes.rows[0];
      } else {
        const contactRes = await db.query(`
          INSERT INTO contacts (customer_id, first_name, last_name, email, phone, is_primary)
          VALUES ($1, $2, $3, $4, $5, true)
          RETURNING *;
        `, [id, firstName, lastName, email, phone]);
        primaryContact = contactRes.rows[0];
      }
    }

    res.status(200).json({
      success: true,
      message: 'Customer updated successfully',
      customer: formatCustomer(result.rows[0], primaryContact)
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete Customer
// @route   DELETE /api/v1/customers/:id
// @access  Private
const deleteCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existingCustomer = await db.query('SELECT * FROM customers WHERE id = $1', [id]);
    if (existingCustomer.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Customer not found.' });
    }

    // Role check: Only Admin or the owner can delete
    if (req.user.role !== 'Admin' && existingCustomer.rows[0].owner_id !== req.user.id) {
       return res.status(403).json({ success: false, error: 'Forbidden. You do not have permission to delete this customer.' });
    }

    await db.query('DELETE FROM customers WHERE id = $1', [id]);

    res.status(200).json({
      success: true,
      message: 'Customer deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCustomers,
  createCustomer,
  getCustomerById,
  updateCustomer,
  deleteCustomer
};
