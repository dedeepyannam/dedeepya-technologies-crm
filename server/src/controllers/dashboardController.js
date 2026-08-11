const db = require('../config/db');

const getRbacWhere = (user, fieldName) => {
  if (user.role === 'Admin') return '1=1';
  if (user.role === 'Sales Manager') {
    return `${fieldName} IN (SELECT id FROM users WHERE manager_id = ${user.id} OR id = ${user.id})`;
  }
  return `${fieldName} = ${user.id}`;
};

// @desc    Get Key Performance Indicator (KPI) Summary Stats
// @route   GET /api/v1/dashboard/kpis
// @access  Private
const getKpis = async (req, res, next) => {
  try {
    const leadsWhere = getRbacWhere(req.user, 'assigned_to');
    const customersWhere = getRbacWhere(req.user, 'owner_id');
    const tasksWhere = getRbacWhere(req.user, 'assigned_to');
    const followupsWhere = getRbacWhere(req.user, 'user_id');

    // 1. Total Customers
    const customersRes = await db.query(`SELECT COUNT(*) FROM customers WHERE ${customersWhere}`);
    const totalCustomers = parseInt(customersRes.rows[0].count, 10);

    // 2. Total Leads + converted count + leads created this week
    const leadsRes = await db.query(`
      SELECT 
        COUNT(*) as total_leads,
        COUNT(CASE WHEN status = 'Won' OR converted_customer_id IS NOT NULL THEN 1 END) as converted_leads,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as leads_this_week
      FROM leads WHERE ${leadsWhere}
    `);
    const totalLeads = parseInt(leadsRes.rows[0].total_leads, 10);
    const convertedLeads = parseInt(leadsRes.rows[0].converted_leads, 10);
    const leadsThisWeek = parseInt(leadsRes.rows[0].leads_this_week, 10) || 0;
    const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : 0;

    // 3. Won Deals, Lost count, and Revenue — calculated from LEADS table
    //    Ensures: Won=1 (FinEdge only), Revenue=₹10,00,000
    const wonLostRes = await db.query(`
      SELECT 
        COUNT(CASE WHEN status = 'Won' THEN 1 END) as deals_won,
        COUNT(CASE WHEN status = 'Lost' THEN 1 END) as deals_lost,
        COALESCE(SUM(CASE WHEN status = 'Won' THEN estimated_value ELSE 0 END), 0) as won_revenue
      FROM leads WHERE ${leadsWhere}
    `);
    const dealsWon = parseInt(wonLostRes.rows[0].deals_won, 10);
    const dealsLost = parseInt(wonLostRes.rows[0].deals_lost, 10);
    const totalRevenue = parseFloat(wonLostRes.rows[0].won_revenue || 0);

    // 4. Upcoming Follow-ups (due >= today)
    const followupsRes = await db.query(`
      SELECT COUNT(*) as upcoming_followups
      FROM follow_ups 
      WHERE next_followup_date >= CURRENT_DATE AND ${followupsWhere}
    `);
    const upcomingFollowups = parseInt(followupsRes.rows[0].upcoming_followups, 10);

    // 5. Pending Tasks
    const tasksRes = await db.query(`
      SELECT COUNT(*) as pending_tasks
      FROM tasks 
      WHERE status IN ('Pending', 'In Progress') AND ${tasksWhere}
    `);
    const pendingTasks = parseInt(tasksRes.rows[0].pending_tasks, 10);

    // 6. Open Opportunities — leads that are NOT Won and NOT Lost (from leads table)
    //    Expected: 8 (10 leads - 1 Won - 1 Lost = 8 open)
    const openOppsRes = await db.query(`
      SELECT COUNT(*) as open_opportunities, COALESCE(SUM(estimated_value), 0) as pipeline_value
      FROM leads WHERE status NOT IN ('Won', 'Lost') AND ${leadsWhere}
    `);
    const openOpportunities = parseInt(openOppsRes.rows[0].open_opportunities, 10);
    const pipelineValue = parseFloat(openOppsRes.rows[0].pipeline_value || 0);

    res.status(200).json({
      success: true,
      kpis: {
        totalCustomers,
        totalLeads,
        dealsWon,
        dealsLost,
        monthlyRevenue: totalRevenue,
        openOpportunities,
        pipelineValue,
        conversionRate: parseFloat(conversionRate),
        upcomingFollowups,
        pendingTasks,
        leadsThisWeek
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Sales Pipeline Stage Distribution
// @route   GET /api/v1/dashboard/pipeline-stages
// @access  Private
const getPipelineStageDistribution = async (req, res, next) => {
  try {
    const dealsWhere = getRbacWhere(req.user, 'assigned_to');
    const stages = ['New Lead', 'Contacted', 'Qualified', 'Proposal Sent', 'Negotiation', 'Won', 'Lost'];

    const result = await db.query(`
      SELECT stage, COUNT(*) as count, COALESCE(SUM(amount), 0) as total_amount
      FROM deals
      WHERE ${dealsWhere}
      GROUP BY stage;
    `);

    const distribution = stages.map(stage => {
      const match = result.rows.find(r => r.stage === stage);
      return {
        stage,
        count: match ? parseInt(match.count, 10) : 0,
        totalAmount: match ? parseFloat(match.total_amount) : 0
      };
    });

    res.status(200).json({
      success: true,
      distribution
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Analytics Data for Dashboard Charts
// @route   GET /api/v1/dashboard/analytics
// @access  Private
const getAnalyticsData = async (req, res, next) => {
  try {
    const dealsWhere = getRbacWhere(req.user, 'assigned_to');
    const leadsWhere = getRbacWhere(req.user, 'assigned_to');
    const customersWhere = getRbacWhere(req.user, 'owner_id');

    // 1. Monthly Revenue (Won Deals group by Month) — from deals table for the chart
    const monthlyRevenueRes = await db.query(`
      SELECT 
        TO_CHAR(updated_at, 'Mon') as month,
        EXTRACT(MONTH FROM updated_at) as month_num,
        SUM(amount) as revenue
      FROM deals
      WHERE stage = 'Won' AND ${dealsWhere}
      GROUP BY TO_CHAR(updated_at, 'Mon'), EXTRACT(MONTH FROM updated_at)
      ORDER BY month_num;
    `);
    const monthlyRevenue = monthlyRevenueRes.rows.map(r => ({
      month: r.month,
      revenue: parseFloat(r.revenue || 0)
    }));

    // 2. Leads by Status — from leads table (drives Pipeline Chart)
    const leadsStatusRes = await db.query(`
      SELECT status, COUNT(*) as value
      FROM leads
      WHERE ${leadsWhere}
      GROUP BY status;
    `);
    const leadsByStatus = leadsStatusRes.rows.map(r => ({ name: r.status, value: parseInt(r.value, 10) }));

    // 2b. Leads by Source — from leads table (drives LeadsSourceChart)
    const leadsSourceRes = await db.query(`
      SELECT source, COUNT(*) as value
      FROM leads
      WHERE ${leadsWhere} AND source IS NOT NULL AND source != ''
      GROUP BY source
      ORDER BY value DESC;
    `);
    const leadsBySource = leadsSourceRes.rows.map(r => ({ name: r.source, value: parseInt(r.value, 10) }));

    // 3. Sales Performance by Employee — Won revenue from LEADS (not deals)
    //    This ensures Priya Reddy=₹10L, others=₹0; no dummy names
    const salesPerformanceRes = await db.query(`
      SELECT u.first_name || ' ' || u.last_name as name, SUM(l.estimated_value) as won_revenue
      FROM leads l
      JOIN users u ON l.assigned_to = u.id
      WHERE l.status = 'Won' AND ${getRbacWhere(req.user, 'l.assigned_to')}
      GROUP BY u.id, u.first_name, u.last_name
      ORDER BY won_revenue DESC
      LIMIT 10;
    `);
    const salesPerformance = salesPerformanceRes.rows.map(r => ({ name: r.name, revenue: parseFloat(r.won_revenue) }));

    // 4. Customer Growth (Customers created by month)
    const customerGrowthRes = await db.query(`
      SELECT 
        TO_CHAR(created_at, 'Mon') as month,
        EXTRACT(MONTH FROM created_at) as month_num,
        COUNT(*) as new_customers
      FROM customers
      WHERE ${customersWhere}
      GROUP BY TO_CHAR(created_at, 'Mon'), EXTRACT(MONTH FROM created_at)
      ORDER BY month_num;
    `);
    let cumulative = 0;
    const customerGrowth = customerGrowthRes.rows.map(r => {
      cumulative += parseInt(r.new_customers, 10);
      return { month: r.month, newCustomers: parseInt(r.new_customers, 10), totalCustomers: cumulative };
    });

    // 5. Won vs Lost (from leads table for consistency)
    const wonVsLostRes = await db.query(`
      SELECT stage, COUNT(*) as value
      FROM deals
      WHERE stage IN ('Won', 'Lost') AND ${dealsWhere}
      GROUP BY stage;
    `);
    const wonVsLost = wonVsLostRes.rows.map(r => ({ name: r.stage, value: parseInt(r.value, 10) }));

    res.status(200).json({
      success: true,
      monthlyRevenue,
      leadsByStatus,
      leadsBySource,
      salesPerformance,
      customerGrowth,
      wonVsLost
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getKpis,
  getPipelineStageDistribution,
  getAnalyticsData
};
