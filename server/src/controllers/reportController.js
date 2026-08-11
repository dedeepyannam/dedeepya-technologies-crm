const db = require('../config/db');

// Helper to build WHERE clause dynamically based on request filters
const buildFilters = (req, dateField, assigneeField) => {
  const { startDate, endDate, employeeId, leadStatus, dealStage } = req.query;
  const conditions = [];

  // Scoping logic (RBAC)
  if (req.user.role === 'Sales Manager') {
    conditions.push(`${assigneeField} IN (SELECT id FROM users WHERE manager_id = ${req.user.id} OR id = ${req.user.id})`);
  } else if (req.user.role === 'Sales Executive') {
    conditions.push(`${assigneeField} = ${req.user.id}`);
  }

  // Explicit filters
  if (startDate) conditions.push(`${dateField} >= '${startDate}'`);
  if (endDate) conditions.push(`${dateField} <= '${endDate} 23:59:59'`);
  if (employeeId) conditions.push(`${assigneeField} = ${employeeId}`);
  
  // Specific filters (these will only be used if the table has these columns, handled in specific queries)
  
  return conditions.length ? 'WHERE ' + conditions.join(' AND ') : 'WHERE 1=1';
};

// @desc    Get Aggregated Reports
// @route   GET /api/v1/reports
// @access  Private
const getReports = async (req, res, next) => {
  try {
    const { leadStatus, dealStage } = req.query;

    const dealsWhere = buildFilters(req, 'updated_at', 'assigned_to');
    const leadsWhere = buildFilters(req, 'created_at', 'assigned_to');
    const customersWhere = buildFilters(req, 'created_at', 'owner_id');

    // Add specific filters
    const finalDealsWhere = dealStage ? `${dealsWhere} AND stage = '${dealStage}'` : dealsWhere;
    const finalLeadsWhere = leadStatus ? `${leadsWhere} AND status = '${leadStatus}'` : leadsWhere;

    // 1. Revenue (Sum of Deals Won in timeframe)
    const revenueRes = await db.query(`
      SELECT COALESCE(SUM(amount), 0) as total_revenue
      FROM deals ${dealsWhere} AND stage = 'Won'
    `);
    const totalRevenue = parseFloat(revenueRes.rows[0].total_revenue || 0);

    // 2. Sales Performance (Deals over time / by employee)
    const salesPerformanceRes = await db.query(`
      SELECT u.first_name || ' ' || u.last_name as name, COUNT(d.id) as deals_count, COALESCE(SUM(d.amount), 0) as total_value
      FROM deals d
      LEFT JOIN users u ON d.assigned_to = u.id
      ${finalDealsWhere}
      GROUP BY u.id, u.first_name, u.last_name
      ORDER BY total_value DESC
    `);
    
    // 3. Lead Conversion
    const leadsRes = await db.query(`
      SELECT status, COUNT(*) as count
      FROM leads ${finalLeadsWhere}
      GROUP BY status
    `);
    let totalFilteredLeads = 0;
    let convertedFilteredLeads = 0;
    leadsRes.rows.forEach(r => {
      totalFilteredLeads += parseInt(r.count, 10);
      if (r.status === 'Won') convertedFilteredLeads += parseInt(r.count, 10);
    });
    const conversionRate = totalFilteredLeads > 0 ? ((convertedFilteredLeads / totalFilteredLeads) * 100).toFixed(1) : 0;

    // 4. Customer Growth (Customers by month)
    const customerGrowthRes = await db.query(`
      SELECT TO_CHAR(created_at, 'Mon-YYYY') as month, COUNT(*) as new_customers
      FROM customers ${customersWhere}
      GROUP BY TO_CHAR(created_at, 'Mon-YYYY'), EXTRACT(YEAR FROM created_at), EXTRACT(MONTH FROM created_at)
      ORDER BY EXTRACT(YEAR FROM created_at), EXTRACT(MONTH FROM created_at)
    `);

    // 5. Raw Data for Tables (for exporting)
    const rawDeals = await db.query(`
      SELECT d.id, d.title, d.stage, d.amount, d.expected_close_date, u.first_name || ' ' || u.last_name as assigned_to
      FROM deals d LEFT JOIN users u ON d.assigned_to = u.id
      ${finalDealsWhere}
      ORDER BY d.created_at DESC
    `);

    const rawLeads = await db.query(`
      SELECT l.id, l.name, l.company, l.status, l.source, l.estimated_value, u.first_name || ' ' || u.last_name as assigned_to
      FROM leads l LEFT JOIN users u ON l.assigned_to = u.id
      ${finalLeadsWhere}
      ORDER BY l.created_at DESC
    `);

    res.status(200).json({
      success: true,
      summary: {
        totalRevenue,
        conversionRate,
        totalFilteredLeads,
        totalFilteredDeals: rawDeals.rows.length
      },
      charts: {
        salesPerformance: salesPerformanceRes.rows,
        leadDistribution: leadsRes.rows,
        customerGrowth: customerGrowthRes.rows
      },
      tables: {
        deals: rawDeals.rows,
        leads: rawLeads.rows
      }
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  getReports
};
