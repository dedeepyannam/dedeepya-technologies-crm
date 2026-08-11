const { Pool } = require('pg');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

dotenv.config();

// ─────────────────────────────────────────
// PostgreSQL Connection Pool
// ─────────────────────────────────────────
const poolConfig = {
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 3000,
};

// Use DATABASE_URL if provided (common in production PaaS like Render, Heroku)
if (process.env.DATABASE_URL) {
  poolConfig.connectionString = process.env.DATABASE_URL;
  // Enable SSL for production database connections unless explicitly disabled
  if (process.env.NODE_ENV === 'production' && process.env.PG_NO_SSL !== 'true') {
    poolConfig.ssl = { rejectUnauthorized: false };
  }
} else {
  poolConfig.host = process.env.PGHOST || 'localhost';
  poolConfig.port = parseInt(process.env.PGPORT || '5432', 10);
  poolConfig.user = process.env.PGUSER || 'postgres';
  poolConfig.password = process.env.PGPASSWORD || 'postgres';
  poolConfig.database = process.env.PGDATABASE || 'crm_db';
}

const pool = new Pool(poolConfig);

// Capture pool errors (e.g. DB restart) so they don't crash the process
pool.on('error', (err) => {
  console.error('⚠️  PostgreSQL pool idle client error:', err.message);
});

let isPgConnected = false;

// ─────────────────────────────────────────
// checkConnection — call once at startup
// ─────────────────────────────────────────
const checkConnection = async () => {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1'); // lightweight liveness test
    client.release();
    isPgConnected = true;
    console.log(`✅ PostgreSQL connected → ${process.env.PGHOST || 'localhost'}:${process.env.PGPORT || 5432}/${process.env.PGDATABASE || 'crm_db'}`);
    return true;
  } catch (err) {
    isPgConnected = false;
    console.warn(`⚠️  PostgreSQL unavailable (${err.message}). Using in-memory fallback store.`);
    return false;
  }
};

// ─────────────────────────────────────────
// runMigration — execute schema.sql
// ─────────────────────────────────────────
const runMigration = async (schemaFilePath) => {
  if (!isPgConnected) {
    throw new Error('Cannot run migration: PostgreSQL is not connected.');
  }
  const sql = fs.readFileSync(schemaFilePath, 'utf8');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('✅ Migration executed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// ─────────────────────────────────────────
// query — unified query wrapper
// Routes to PostgreSQL when connected,
// falls back to in-memory store otherwise.
// ─────────────────────────────────────────
const query = async (text, params = []) => {
  if (isPgConnected) {
    try {
      return await pool.query(text, params);
    } catch (err) {
      // Log the error but do NOT silently swallow it in production
      if (process.env.NODE_ENV === 'development') {
        console.warn(`PostgreSQL query error: ${err.message}`);
        console.warn('Falling back to in-memory store for this request.');
      }
    }
  }
  return handleMemoryQuery(text, params);
};

// ─────────────────────────────────────────
// In-Memory Database Fallback Store
// Used when PostgreSQL is unavailable.
// Seeded with realistic demo data on startup.
// ─────────────────────────────────────────
const memoryDb = {
  users: [],
  customers: [],
  contacts: [],
  leads: [],
  deals: [],
  tasks: [],
  follow_ups: [],
  notifications: [],
  audit_logs: [],
};

const initMemoryStore = async () => {
  const seedPath = path.join(__dirname, '..', '..', 'seedData.json');
  if (fs.existsSync(seedPath)) {
    const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
    memoryDb.users = seedData.users;
    memoryDb.customers = seedData.customers;
    memoryDb.contacts = seedData.contacts;
    memoryDb.leads = seedData.leads;
    memoryDb.deals = seedData.deals;
    memoryDb.tasks = seedData.tasks;
    memoryDb.follow_ups = seedData.followups;
    memoryDb.notifications = seedData.notifications;
    memoryDb.audit_logs = [{ id: 1, user_id: 1, action: 'Created', entity: 'System', record_id: 0, details: 'System initialization from seedData.json', ip_address: '127.0.0.1', created_at: new Date().toISOString() }];
    console.log('✅ Loaded database from seedData.json');
    return;
  }

  const passwordHash = await bcrypt.hash('password123', 10);
  const now = new Date().toISOString();

  memoryDb.users = [
    { id: 1, first_name: 'Sarah',  last_name: 'Connor',  email: 'admin@crm.com',   password_hash: passwordHash, role: 'Admin',           manager_id: null, phone: '+1 555-0101', is_active: true, created_at: now, updated_at: now },
    { id: 2, first_name: 'Marcus', last_name: 'Vance',   email: 'manager@crm.com', password_hash: passwordHash, role: 'Sales Manager',   manager_id: 1,    phone: '+1 555-0102', is_active: true, created_at: now, updated_at: now },
    { id: 3, first_name: 'Alex',   last_name: 'Mercer',  email: 'alex@crm.com',    password_hash: passwordHash, role: 'Sales Executive', manager_id: 2,    phone: '+1 555-0103', is_active: true, created_at: now, updated_at: now },
    { id: 4, first_name: 'Elena',  last_name: 'Rostova', email: 'elena@crm.com',   password_hash: passwordHash, role: 'Sales Executive', manager_id: 2,    phone: '+1 555-0104', is_active: true, created_at: now, updated_at: now },
    { id: 5, first_name: 'David',  last_name: 'Kim',     email: 'david@crm.com',   password_hash: passwordHash, role: 'Sales Executive', manager_id: 2,    phone: '+1 555-0105', is_active: true, created_at: now, updated_at: now },
  ];

  memoryDb.customers = [
    { id: 1, name: 'Acme Technologies',   industry: 'Software & IT',      website: 'https://acmetech.io',          email: 'info@acmetech.io',          phone: '+1 800-555-0199', address: '100 Silicon Way', city: 'San Francisco', country: 'USA', owner_id: 3, created_at: now, updated_at: now },
    { id: 2, name: 'Global Logistics Corp', industry: 'Transportation',   website: 'https://globallogistics.com', email: 'contact@globallogistics.com', phone: '+1 800-555-0200', address: '450 Harbor Blvd', city: 'Seattle',       country: 'USA', owner_id: 4, created_at: now, updated_at: now },
    { id: 3, name: 'Apex Financial Group', industry: 'Banking & Finance', website: 'https://apexfinancial.com',   email: 'services@apexfinancial.com',  phone: '+1 800-555-0300', address: '1 Wall Street',   city: 'New York',      country: 'USA', owner_id: 3, created_at: now, updated_at: now },
    { id: 4, name: 'Vanguard Healthcare',  industry: 'Healthcare',        website: 'https://vanguardhealth.org',  email: 'support@vanguardhealth.org',  phone: '+1 800-555-0400', address: '88 Health Ave',   city: 'Boston',        country: 'USA', owner_id: 5, created_at: now, updated_at: now },
    { id: 5, name: 'Nexus Cloud Systems',  industry: 'Cloud & Hosting',   website: 'https://nexuscloud.net',      email: 'hello@nexuscloud.net',        phone: '+1 800-555-0500', address: '500 Innovation Park', city: 'Austin',    country: 'USA', owner_id: 4, created_at: now, updated_at: now },
  ];

  memoryDb.audit_logs = [
    { id: 1, user_id: 1, action: 'Created', entity: 'System', record_id: 0, details: 'System initialization', ip_address: '127.0.0.1', created_at: now }
  ];

  memoryDb.notifications = [
    { id: 1, user_id: 1, title: 'Welcome', message: 'Welcome to ApexCRM!', type: 'info', is_read: false, link: null, created_at: now }
  ];

  memoryDb.contacts = [
    { id: 1, customer_id: 1, first_name: 'John',      last_name: 'Doe',      email: 'john.doe@acmetech.io',         phone: '+1 555-9011', job_title: 'Chief Technology Officer',        is_primary: true,  created_at: now },
    { id: 2, customer_id: 1, first_name: 'Jane',      last_name: 'Smith',    email: 'jane.smith@acmetech.io',       phone: '+1 555-9012', job_title: 'VP of Engineering',               is_primary: false, created_at: now },
    { id: 3, customer_id: 2, first_name: 'Robert',    last_name: 'Lang',     email: 'rlang@globallogistics.com',    phone: '+1 555-9021', job_title: 'Head of Supply Chain',            is_primary: true,  created_at: now },
    { id: 4, customer_id: 3, first_name: 'Victoria',  last_name: 'Sterling', email: 'vsterling@apexfinancial.com',  phone: '+1 555-9031', job_title: 'Director of Operations',          is_primary: true,  created_at: now },
    { id: 5, customer_id: 4, first_name: 'Dr. Alan',  last_name: 'Grant',    email: 'agrant@vanguardhealth.org',    phone: '+1 555-9041', job_title: 'Chief Medical Information Officer',is_primary: true,  created_at: now },
    { id: 6, customer_id: 5, first_name: 'Samantha',  last_name: 'Wright',   email: 'swright@nexuscloud.net',       phone: '+1 555-9051', job_title: 'CEO',                              is_primary: true,  created_at: now },
  ];

  memoryDb.leads = [
    { id: 1, title: 'Enterprise Cloud Migration',  company_name: 'CyberDyne Systems',  contact_name: 'Miles Dyson',    email: 'mdyson@cyberdyne.io',         phone: '+1 555-7701', source: 'Website Inquiry', status: 'New Lead',      estimated_value: 120000, assigned_to: 3, converted_customer_id: null, notes: 'Inquired about migrating on-prem infrastructure to multi-cloud.',         created_at: now, updated_at: now },
    { id: 2, title: 'CRM Modernization Project',   company_name: 'Stark Industries',   contact_name: 'Pepper Potts',   email: 'pep@starkind.com',            phone: '+1 555-7702', source: 'Referral',        status: 'Contacted',     estimated_value: 85000,  assigned_to: 4, converted_customer_id: null, notes: 'Had initial discovery call. Requesting product overview deck.',           created_at: now, updated_at: now },
    { id: 3, title: 'AI Analytics Suite',          company_name: 'Wayne Enterprises',  contact_name: 'Lucius Fox',     email: 'lfox@wayneent.com',           phone: '+1 555-7703', source: 'LinkedIn Outbound',status: 'Qualified',     estimated_value: 250000, assigned_to: 3, converted_customer_id: null, notes: 'Budget confirmed. Technical decision maker meeting scheduled.',           created_at: now, updated_at: now },
    { id: 4, title: 'Security Audit Contract',     company_name: 'Umbrella Corp',      contact_name: 'Albert Wesker',  email: 'awesker@umbrella.com',        phone: '+1 555-7704', source: 'Trade Show',      status: 'Proposal Sent', estimated_value: 45000,  assigned_to: 5, converted_customer_id: null, notes: 'Sent formal security compliance proposal. Awaiting procurement response.',created_at: now, updated_at: now },
    { id: 5, title: 'Fleet Management Software',   company_name: 'Initech Solutions',  contact_name: 'Peter Gibbons',  email: 'pgibbons@initech.com',        phone: '+1 555-7705', source: 'Direct Call',     status: 'Negotiation',   estimated_value: 60000,  assigned_to: 4, converted_customer_id: null, notes: 'Final price negotiation in progress for 500 licenses.',                  created_at: now, updated_at: now },
    { id: 6, title: 'SaaS Infrastructure Deal',    company_name: 'Massive Dynamic',    contact_name: 'Nina Sharp',     email: 'nsharp@massivedynamic.com',   phone: '+1 555-7706', source: 'Partner',         status: 'Won',           estimated_value: 180000, assigned_to: 3, converted_customer_id: null, notes: 'Contract signed! Lead converted into active deal.',                      created_at: now, updated_at: now },
    { id: 7, title: 'Legacy Database Upgrade',     company_name: 'Hooli Inc',          contact_name: 'Gavin Belson',   email: 'gbelson@hooli.com',           phone: '+1 555-7707', source: 'Website Inquiry', status: 'Lost',          estimated_value: 35000,  assigned_to: 5, converted_customer_id: null, notes: 'Decided to defer project until next fiscal year.',                       created_at: now, updated_at: now },
  ];

  memoryDb.deals = [
    { id: 1, title: 'Acme ERP Integration Phase 1',        customer_id: 1, lead_id: 1, amount: 150000, stage: 'New Lead',      probability: 20,  expected_close_date: '2026-09-30', assigned_to: 3, created_at: now, updated_at: now },
    { id: 2, title: 'Global Logistics Dispatch System',     customer_id: 2, lead_id: 2, amount: 95000,  stage: 'Contacted',     probability: 35,  expected_close_date: '2026-10-15', assigned_to: 4, created_at: now, updated_at: now },
    { id: 3, title: 'Apex Financial Risk Platform',         customer_id: 3, lead_id: 3, amount: 320000, stage: 'Qualified',     probability: 50,  expected_close_date: '2026-11-01', assigned_to: 3, created_at: now, updated_at: now },
    { id: 4, title: 'Vanguard Patient Portal Expansion',    customer_id: 4, lead_id: 4, amount: 180000, stage: 'Proposal Sent', probability: 70,  expected_close_date: '2026-08-31', assigned_to: 5, created_at: now, updated_at: now },
    { id: 5, title: 'Nexus Cloud Hybrid Architecture',      customer_id: 5, lead_id: 5, amount: 210000, stage: 'Negotiation',   probability: 85,  expected_close_date: '2026-08-25', assigned_to: 4, created_at: now, updated_at: now },
    { id: 6, title: 'Acme Security Enhancements',           customer_id: 1, lead_id: null, amount: 75000,  stage: 'Won',       probability: 100, expected_close_date: '2026-07-15', assigned_to: 3, created_at: now, updated_at: now },
    { id: 7, title: 'Global Fleet Tracking Add-on',         customer_id: 2, lead_id: null, amount: 40000,  stage: 'Lost',      probability: 0,   expected_close_date: '2026-06-30', assigned_to: 4, created_at: now, updated_at: now },
  ];

  memoryDb.tasks = [
    { id: 1, title: 'Follow up with Miles Dyson',     description: 'Send technical cloud migration security docs.',          due_date: new Date(Date.now() + 86400000).toISOString(),  status: 'Pending',     priority: 'High',   assigned_to: 3, created_by: 1, lead_id: 1, deal_id: 1, customer_id: 1, created_at: now, updated_at: now },
    { id: 2, title: 'Prepare Custom Proposal Deck',   description: 'Draft tailored proposal for Vanguard Patient Portal.',  due_date: new Date(Date.now() + 172800000).toISOString(), status: 'In Progress', priority: 'Urgent', assigned_to: 5, created_by: 2, lead_id: 4, deal_id: 4, customer_id: 4, created_at: now, updated_at: now },
    { id: 3, title: 'Schedule Product Demo',          description: 'Conduct live demo of risk platform for Apex team.',     due_date: new Date(Date.now() + 259200000).toISOString(), status: 'Pending',     priority: 'Medium', assigned_to: 3, created_by: 2, lead_id: 3, deal_id: 3, customer_id: 3, created_at: now, updated_at: now },
    { id: 4, title: 'Review Contract Terms',          description: 'Finalize legal clause reviews for Nexus Cloud.',        due_date: new Date(Date.now() - 86400000).toISOString(),  status: 'Completed',   priority: 'High',   assigned_to: 4, created_by: 1, lead_id: 5, deal_id: 5, customer_id: 5, created_at: now, updated_at: now },
    { id: 5, title: 'Send Quarterly Account Review',  description: 'Check in with Acme Technologies primary contact.',      due_date: new Date(Date.now() + 432000000).toISOString(), status: 'Pending',     priority: 'Low',    assigned_to: 3, created_by: 1, lead_id: null, deal_id: 6, customer_id: 1, created_at: now, updated_at: now },
  ];

  memoryDb.follow_ups = [
    { id: 1, title: 'Initial Discovery Call',          type: 'Call',    notes: 'Discussed current infrastructure bottlenecks and budget scope.',      follow_up_date: new Date(Date.now() - 259200000).toISOString(), user_id: 3, lead_id: 1, deal_id: 1, customer_id: 1, created_at: now },
    { id: 2, title: 'Product Demo Meeting',            type: 'Meeting', notes: 'Demonstrated core analytics capabilities to executive team.',          follow_up_date: new Date(Date.now() - 172800000).toISOString(), user_id: 4, lead_id: 2, deal_id: 2, customer_id: 2, created_at: now },
    { id: 3, title: 'Proposal Email Sent',             type: 'Email',   notes: 'Sent updated enterprise pricing proposal with custom add-ons.',        follow_up_date: new Date(Date.now() - 86400000).toISOString(),  user_id: 5, lead_id: 4, deal_id: 4, customer_id: 4, created_at: now },
    { id: 4, title: 'Contract Negotiation Notes',      type: 'Note',    notes: 'Customer requested 5% discount for 3-year term commitment.',           follow_up_date: new Date(Date.now() - 18000000).toISOString(),  user_id: 4, lead_id: 5, deal_id: 5, customer_id: 5, created_at: now },
  ];

  memoryDb.notifications = [
    { id: 1, user_id: 3, title: 'New Lead Assigned',           message: 'You have been assigned to lead "Enterprise Cloud Migration".',      type: 'lead_assignment', is_read: false, link: '/leads',    created_at: now },
    { id: 2, user_id: 3, title: 'High Priority Task Due Soon', message: 'Task "Follow up with Miles Dyson" is due tomorrow.',                type: 'task_due',        is_read: false, link: '/tasks',    created_at: now },
    { id: 3, user_id: 4, title: 'Deal Stage Updated',          message: 'Deal "Nexus Cloud Hybrid Architecture" moved to Negotiation.',       type: 'deal_update',     is_read: true,  link: '/pipeline', created_at: now },
    { id: 4, user_id: 5, title: 'Proposal Action Required',    message: 'Prepare proposal deck for Vanguard Patient Portal.',                 type: 'task_due',        is_read: false, link: '/tasks',    created_at: now },
  ];
};

initMemoryStore();

// ─────────────────────────────────────────
// In-memory SQL query router
// Handles the most common SELECT / INSERT
// patterns to keep the API functional when
// PostgreSQL is offline (development mode).
// ─────────────────────────────────────────
function handleMemoryQuery(text, params) {
  const sql   = text.trim();
  const lower = sql.toLowerCase();

  // ── USERS ────────────────────────────
  if (lower.includes('from users')) {
    let rows = [...memoryDb.users];
    if (lower.includes('where email'))       rows = rows.filter(u => u.email.toLowerCase() === params[0]?.toLowerCase());
    else if (lower.includes('where id = $1')) rows = rows.filter(u => u.id === parseInt(params[0], 10));
    return { rows, rowCount: rows.length };
  }
  
  if (lower.startsWith('insert into users')) {
    const newId = memoryDb.users.length ? Math.max(...memoryDb.users.map(u => u.id)) + 1 : 1;
    const now = new Date().toISOString();
    // Assuming params: [first_name, last_name, email, password_hash, role]
    const user = {
      id: newId,
      first_name: params[0],
      last_name: params[1],
      email: params[2],
      password_hash: params[3],
      role: params[4] || 'Sales Executive',
      manager_id: null,
      phone: null,
      is_active: true,
      created_at: now,
      updated_at: now
    };
    memoryDb.users.push(user);
    // return inserted user
    return { rows: [user], rowCount: 1 };
  }

  // ── LEADS ────────────────────────────
  if (lower.startsWith('select') && lower.includes('from leads')) {

    // ── Special case: Dashboard KPI — total_leads + converted_leads + leads_this_week
    if (lower.includes('total_leads') && lower.includes('converted_leads')) {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const leadsThisWeek = memoryDb.leads.filter(l => new Date(l.created_at) >= oneWeekAgo).length;
      return { rows: [{
        total_leads: memoryDb.leads.length,
        converted_leads: memoryDb.leads.filter(l => l.status === 'Won' || l.converted_customer_id).length,
        leads_this_week: leadsThisWeek
      }], rowCount: 1 };
    }

    // ── Special case: Dashboard KPI — Won/Lost count + won revenue from leads
    if (lower.includes('won_revenue') && lower.includes('deals_won') && lower.includes('deals_lost')) {
      const wonLeads  = memoryDb.leads.filter(l => l.status === 'Won');
      const lostLeads = memoryDb.leads.filter(l => l.status === 'Lost');
      const wonRevenue = wonLeads.reduce((s, l) => s + Number(l.estimated_value || 0), 0);
      return { rows: [{ deals_won: wonLeads.length, deals_lost: lostLeads.length, won_revenue: wonRevenue }], rowCount: 1 };
    }

    // ── Special case: Dashboard KPI — open opportunities + pipeline value from leads
    if (lower.includes('open_opportunities') && lower.includes('pipeline_value')) {
      const openLeads = memoryDb.leads.filter(l => l.status !== 'Won' && l.status !== 'Lost');
      const pipelineVal = openLeads.reduce((s, l) => s + Number(l.estimated_value || 0), 0);
      return { rows: [{ open_opportunities: openLeads.length, pipeline_value: pipelineVal }], rowCount: 1 };
    }

    // ── Special case: Analytics — leads grouped by status (Pipeline Chart)
    if (lower.includes('group by status')) {
      const statusMap = {};
      memoryDb.leads.forEach(l => { statusMap[l.status] = (statusMap[l.status] || 0) + 1; });
      const statusRows = Object.entries(statusMap)
        .filter(([, v]) => v > 0)
        .map(([status, value]) => ({ status, value }));
      return { rows: statusRows, rowCount: statusRows.length };
    }

    // ── Special case: Analytics — leads grouped by source (LeadsSourceChart)
    if (lower.includes('group by source')) {
      const sourceMap = {};
      memoryDb.leads.forEach(l => { if (l.source) sourceMap[l.source] = (sourceMap[l.source] || 0) + 1; });
      const sourceRows = Object.entries(sourceMap)
        .map(([source, value]) => ({ source, value }))
        .sort((a, b) => b.value - a.value);
      return { rows: sourceRows, rowCount: sourceRows.length };
    }

    // ── Special case: Analytics — sales performance by exec from won leads
    if (lower.includes('group by u.id') && lower.includes('won_revenue')) {
      const wonLeads = memoryDb.leads.filter(l => l.status === 'Won');
      const perfMap = {};
      wonLeads.forEach(l => {
        const u = memoryDb.users.find(u => u.id === l.assigned_to);
        if (!u) return;
        const nm = `${u.first_name} ${u.last_name}`;
        perfMap[nm] = (perfMap[nm] || 0) + Number(l.estimated_value || 0);
      });
      const perfRows = Object.entries(perfMap)
        .map(([name, won_revenue]) => ({ name, won_revenue }))
        .sort((a, b) => b.won_revenue - a.won_revenue);
      return { rows: perfRows, rowCount: perfRows.length };
    }

    let rows = memoryDb.leads.map(l => ({
      ...l,
      assigned_first_name: memoryDb.users.find(u => u.id === l.assigned_to)?.first_name || '',
      assigned_last_name:  memoryDb.users.find(u => u.id === l.assigned_to)?.last_name  || '',
    }));

    // Filter by ID or Email
    if (lower.includes('where l.id = $1') || lower.includes('where id = $1')) {
      rows = rows.filter(l => l.id === parseInt(params[0], 10));
    }
    if (lower.includes('where email = $1') || lower.includes('where l.email = $1')) {
      rows = rows.filter(l => l.email === params[0]);
    }
    // Very basic filter matching for memory DB (status, assigned_to)
    if (lower.includes('l.status = $')) {
      const statusParamIdx = lower.indexOf('l.status = $') + 12;
      const paramIdx = parseInt(lower.substring(statusParamIdx, statusParamIdx+1), 10) - 1;
      if (params[paramIdx]) rows = rows.filter(l => l.status === params[paramIdx]);
    }
    if (lower.includes('l.assigned_to = $')) {
      const assignParamIdx = lower.indexOf('l.assigned_to = $') + 17;
      const paramIdx = parseInt(lower.substring(assignParamIdx, assignParamIdx+1), 10) - 1;
      if (params[paramIdx]) rows = rows.filter(l => l.assigned_to === params[paramIdx]);
    }

    // Handle COUNT
    if (lower.includes('count(*)')) {
      return { rows: [{ count: rows.length }], rowCount: 1 };
    }

    // Handle LIMIT / OFFSET (very crudely by looking at the last 2 params)
    if (lower.includes('limit $')) {
      const limit = parseInt(params[params.length - 2], 10) || 10;
      const offset = parseInt(params[params.length - 1], 10) || 0;
      rows = rows.slice(offset, offset + limit);
    }

    return { rows, rowCount: rows.length };
  }

  if (lower.startsWith('insert into leads')) {
    const newId = memoryDb.leads.length ? Math.max(...memoryDb.leads.map(l => l.id)) + 1 : 1;
    const now = new Date().toISOString();
    const lead = { id: newId, title: params[0], company_name: params[1], contact_name: params[2], email: params[3], phone: params[4], source: params[5] || 'Direct', status: params[6] || 'New Lead', estimated_value: parseFloat(params[7] || 0), assigned_to: params[8] ? parseInt(params[8], 10) : null, notes: params[9] || '', created_at: now, updated_at: now };
    memoryDb.leads.unshift(lead);
    return { rows: [lead], rowCount: 1 };
  }

  if (lower.startsWith('update leads') && !lower.includes('set status = \'won\'')) {
    // If it's the full UPDATE statement from updateLead
    if (lower.includes('coalesce')) {
      const id = parseInt(params[8], 10);
      const leadIndex = memoryDb.leads.findIndex(l => l.id === id);
      if (leadIndex >= 0) {
        memoryDb.leads[leadIndex] = {
          ...memoryDb.leads[leadIndex],
          title: params[0] || memoryDb.leads[leadIndex].title,
          company_name: params[1] !== undefined ? params[1] : memoryDb.leads[leadIndex].company_name,
          contact_name: params[2] || memoryDb.leads[leadIndex].contact_name,
          email: params[3] || memoryDb.leads[leadIndex].email,
          phone: params[4] !== undefined ? params[4] : memoryDb.leads[leadIndex].phone,
          source: params[5] || memoryDb.leads[leadIndex].source,
          status: params[6] || memoryDb.leads[leadIndex].status,
          assigned_to: params[7] !== undefined ? parseInt(params[7], 10) : memoryDb.leads[leadIndex].assigned_to,
          updated_at: new Date().toISOString()
        };
        return { rows: [memoryDb.leads[leadIndex]], rowCount: 1 };
      }
    } else {
      // Simple status update
      const id = parseInt(params[1], 10);
      const lead = memoryDb.leads.find(l => l.id === id);
      if (lead) {
        lead.status = params[0];
        lead.updated_at = new Date().toISOString();
        return { rows: [lead], rowCount: 1 };
      }
    }
  }
  
  if (lower.startsWith('update leads') && lower.includes('set status = \'won\'')) {
     const id = parseInt(params[1] ?? params[0], 10);
     const lead = memoryDb.leads.find(l => l.id === id);
     if (lead) {
       lead.status = 'Won';
       lead.converted_customer_id = parseInt(params[0], 10) || lead.converted_customer_id;
       lead.updated_at = new Date().toISOString();
       return { rows: [lead], rowCount: 1 };
     }
  }

  // Generic leads status update (e.g. UPDATE leads SET status = $1, updated_at = ... WHERE id = $2)
  if (lower.startsWith('update leads') && lower.includes('set status =') && !lower.includes("set status = 'won'")) {
    const id = parseInt(params[params.length - 1], 10);
    const lead = memoryDb.leads.find(l => l.id === id);
    if (lead) {
      lead.status = params[0];
      lead.updated_at = new Date().toISOString();
      return { rows: [lead], rowCount: 1 };
    }
  }

  if (lower.startsWith('delete from leads')) {
    const id = parseInt(params[0], 10);
    const initialLen = memoryDb.leads.length;
    memoryDb.leads = memoryDb.leads.filter(l => l.id !== id);
    return { rows: [], rowCount: initialLen - memoryDb.leads.length };
  }

  // ── CUSTOMERS ────────────────────────
  if (lower.startsWith('select') && lower.includes('from customers')) {
    let rows = memoryDb.customers.map(c => ({
      ...c,
      owner_first_name: memoryDb.users.find(u => u.id === c.owner_id)?.first_name || '',
      owner_last_name:  memoryDb.users.find(u => u.id === c.owner_id)?.last_name  || '',
    }));

    if (lower.includes('left join contacts pc')) {
      // Simulate join with contacts for primary contact info
      rows = rows.map(c => {
        const pc = memoryDb.contacts.find(con => con.customer_id === c.id && con.is_primary);
        return {
          ...c,
          contact_first: pc?.first_name,
          contact_last: pc?.last_name,
          contact_email: pc?.email,
          contact_phone: pc?.phone
        };
      });
    }

    if (lower.includes('where c.id = $1') || lower.includes('where id = $1')) {
      rows = rows.filter(c => c.id === parseInt(params[0], 10));
    }
    if (lower.includes('where email = $1') || lower.includes('where c.email = $1')) {
      rows = rows.filter(c => c.email === params[0]);
    }
    
    // Very basic search filter
    if (lower.includes('c.name ilike $')) {
      const searchParam = params[params.length - 1]; // Assume search is last param before limit/offset
      if (typeof searchParam === 'string' && searchParam.startsWith('%')) {
        const term = searchParam.replace(/%/g, '').toLowerCase();
        rows = rows.filter(c => 
          c.name.toLowerCase().includes(term) || 
          (c.email && c.email.toLowerCase().includes(term)) ||
          (c.contact_first && c.contact_first.toLowerCase().includes(term))
        );
      }
    }

    if (lower.includes('count(*)')) {
      return { rows: [{ count: rows.length }], rowCount: 1 };
    }

    if (lower.includes('limit $')) {
      const limit = parseInt(params[params.length - 2], 10) || 10;
      const offset = parseInt(params[params.length - 1], 10) || 0;
      rows = rows.slice(offset, offset + limit);
    }
    return { rows, rowCount: rows.length };
  }

  if (lower.startsWith('insert into customers')) {
    const newId = memoryDb.customers.length ? Math.max(...memoryDb.customers.map(c => c.id)) + 1 : 1;
    const now = new Date().toISOString();
    
    // Handle either old syntax (4 params: name, email, phone, owner_id) or new syntax (7 params)
    let customer;
    if (params.length > 5) {
      // New structure: name, email, phone, address, notes, lead_id, owner_id
      customer = { id: newId, name: params[0], email: params[1], phone: params[2], address: params[3], notes: params[4], lead_id: params[5], owner_id: parseInt(params[6], 10), created_at: now, updated_at: now };
    } else {
      // Old structure used by convertLead initially or tests
      customer = { id: newId, name: params[0], email: params[1], phone: params[2], owner_id: parseInt(params[3], 10), lead_id: params[4] || null, address: '', notes: '', created_at: now, updated_at: now };
    }
    memoryDb.customers.unshift(customer);
    return { rows: [customer], rowCount: 1 };
  }

  if (lower.startsWith('update customers')) {
    const id = parseInt(params[params.length - 1], 10);
    const index = memoryDb.customers.findIndex(c => c.id === id);
    if (index >= 0) {
      memoryDb.customers[index] = {
        ...memoryDb.customers[index],
        name: params[0] || memoryDb.customers[index].name,
        email: params[1] !== undefined ? params[1] : memoryDb.customers[index].email,
        phone: params[2] !== undefined ? params[2] : memoryDb.customers[index].phone,
        address: params[3] !== undefined ? params[3] : memoryDb.customers[index].address,
        notes: params[4] !== undefined ? params[4] : memoryDb.customers[index].notes,
        owner_id: params[5] !== undefined ? parseInt(params[5], 10) : memoryDb.customers[index].owner_id,
        updated_at: new Date().toISOString()
      };
      return { rows: [memoryDb.customers[index]], rowCount: 1 };
    }
  }

  if (lower.startsWith('delete from customers')) {
    const id = parseInt(params[0], 10);
    const initialLen = memoryDb.customers.length;
    memoryDb.customers = memoryDb.customers.filter(c => c.id !== id);
    // Also delete associated contacts
    memoryDb.contacts = memoryDb.contacts.filter(c => c.customer_id !== id);
    return { rows: [], rowCount: initialLen - memoryDb.customers.length };
  }

  // ── CONTACTS ────────────────────────
  if (lower.startsWith('select') && lower.includes('from contacts')) {
    let rows = [...memoryDb.contacts];
    if (lower.includes('customer_id = $1')) rows = rows.filter(c => c.customer_id === parseInt(params[0], 10));
    if (lower.includes('is_primary = true')) rows = rows.filter(c => c.is_primary === true);
    return { rows, rowCount: rows.length };
  }

  if (lower.startsWith('insert into contacts')) {
    const newId = memoryDb.contacts.length ? Math.max(...memoryDb.contacts.map(c => c.id)) + 1 : 1;
    const now = new Date().toISOString();
    const contact = { id: newId, customer_id: parseInt(params[0], 10), first_name: params[1], last_name: params[2], email: params[3], phone: params[4], is_primary: params.length > 5 ? params[params.length - 1] : false, created_at: now, updated_at: now };
    memoryDb.contacts.unshift(contact);
    return { rows: [contact], rowCount: 1 };
  }

  if (lower.startsWith('update contacts')) {
    const id = parseInt(params[4], 10);
    const index = memoryDb.contacts.findIndex(c => c.id === id);
    if (index >= 0) {
      memoryDb.contacts[index] = {
        ...memoryDb.contacts[index],
        first_name: params[0],
        last_name: params[1],
        email: params[2],
        phone: params[3],
        updated_at: new Date().toISOString()
      };
      return { rows: [memoryDb.contacts[index]], rowCount: 1 };
    }
  }

  // ── DEALS ────────────────────────────
  if (lower.includes('from deals')) {
    let rows = memoryDb.deals.map(d => {
      const customer = memoryDb.customers.find(c => c.id === d.customer_id);
      const lead = memoryDb.leads.find(l => l.id === d.lead_id);
      const contact = memoryDb.contacts.find(c => c.customer_id === d.customer_id && c.is_primary);
      
      let contact_name = 'Unknown';
      if (lead && lead.contact_name) contact_name = lead.contact_name;
      else if (contact) contact_name = `${contact.first_name} ${contact.last_name}`;

      return {
        ...d,
        customer_name:        customer?.name || 'Unknown',
        contact_name:         contact_name,
        assigned_first_name:  memoryDb.users.find(u => u.id === d.assigned_to)?.first_name     || '',
        assigned_last_name:   memoryDb.users.find(u => u.id === d.assigned_to)?.last_name      || '',
      };
    });
    if (lower.includes('where id = $1')) rows = rows.filter(d => d.id === parseInt(params[0], 10));
    return { rows, rowCount: rows.length };
  }

  if (lower.startsWith('insert into deals')) {
    const newId = memoryDb.deals.length ? Math.max(...memoryDb.deals.map(d => d.id)) + 1 : 1;
    const now = new Date().toISOString();
    const deal = { id: newId, title: params[0], customer_id: parseInt(params[1], 10), lead_id: params[2] ? parseInt(params[2], 10) : null, amount: parseFloat(params[3] || 0), stage: params[4] || 'New Lead', probability: parseInt(params[5] || 10, 10), expected_close_date: params[6] || null, assigned_to: params[7] ? parseInt(params[7], 10) : null, created_at: now, updated_at: now };
    memoryDb.deals.unshift(deal);
    return { rows: [deal], rowCount: 1 };
  }

  if (lower.startsWith('update deals') && lower.includes('set stage')) {
    const deal = memoryDb.deals.find(d => d.id === parseInt(params[2], 10));
    if (deal) { 
      deal.stage = params[0]; 
      deal.probability = parseInt(params[1], 10);
      deal.updated_at = new Date().toISOString(); 
      return { rows: [deal], rowCount: 1 }; 
    }
    return { rows: [], rowCount: 0 };
  }

  // ── TASKS ────────────────────────────
  if (lower.includes('from tasks')) {
    let rows = memoryDb.tasks.map(t => ({
      ...t,
      assigned_first_name: memoryDb.users.find(u => u.id === t.assigned_to)?.first_name || '',
      assigned_last_name:  memoryDb.users.find(u => u.id === t.assigned_to)?.last_name  || '',
    }));
    if (lower.includes('where id = $1')) rows = rows.filter(t => t.id === parseInt(params[0], 10));
    return { rows, rowCount: rows.length };
  }

  if (lower.startsWith('insert into tasks')) {
    const newId = memoryDb.tasks.length ? Math.max(...memoryDb.tasks.map(t => t.id)) + 1 : 1;
    const now = new Date().toISOString();
    const task = { id: newId, title: params[0], description: params[1], due_date: params[2], status: params[3] || 'Pending', priority: params[4] || 'Medium', assigned_to: parseInt(params[5], 10), created_by: params[6] ? parseInt(params[6], 10) : null, lead_id: params[7] ? parseInt(params[7], 10) : null, deal_id: params[8] ? parseInt(params[8], 10) : null, customer_id: params[9] ? parseInt(params[9], 10) : null, created_at: now, updated_at: now };
    memoryDb.tasks.unshift(task);
    return { rows: [task], rowCount: 1 };
  }

  if (lower.startsWith('update tasks') && lower.includes('set status = $1, title = $2')) {
    const task = memoryDb.tasks.find(t => t.id === parseInt(params[5], 10));
    if (task) {
      task.status = params[0];
      task.title = params[1];
      task.description = params[2];
      task.due_date = params[3];
      task.priority = params[4];
      task.updated_at = new Date().toISOString();
      return { rows: [task], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }

  if (lower.startsWith('update tasks') && lower.includes('set status = $1, updated_at')) {
    const task = memoryDb.tasks.find(t => t.id === parseInt(params[1], 10));
    if (task) {
      task.status = params[0];
      task.updated_at = new Date().toISOString();
      return { rows: [task], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }

  if (lower.startsWith('delete from tasks')) {
    const initialLen = memoryDb.tasks.length;
    memoryDb.tasks = memoryDb.tasks.filter(t => t.id !== parseInt(params[0], 10));
    return { rows: [], rowCount: initialLen - memoryDb.tasks.length };
  }

  // ── FOLLOW-UPS ───────────────────────
  if (lower.includes('from follow_ups')) {
    const rows = memoryDb.follow_ups.map(f => ({
      ...f,
      user_first_name: memoryDb.users.find(u => u.id === f.user_id)?.first_name || '',
      user_last_name:  memoryDb.users.find(u => u.id === f.user_id)?.last_name  || '',
    }));
    return { rows, rowCount: rows.length };
  }

  if (lower.startsWith('insert into follow_ups')) {
    const newId = memoryDb.follow_ups.length ? Math.max(...memoryDb.follow_ups.map(f => f.id)) + 1 : 1;
    const followUp = { id: newId, title: params[0], type: params[1] || 'Call', notes: params[2] || '', follow_up_date: params[3] || new Date().toISOString(), user_id: parseInt(params[4], 10), lead_id: params[5] ? parseInt(params[5], 10) : null, deal_id: params[6] ? parseInt(params[6], 10) : null, customer_id: params[7] ? parseInt(params[7], 10) : null, next_followup_date: params[8] || null, created_at: new Date().toISOString() };
    memoryDb.follow_ups.unshift(followUp);
    return { rows: [followUp], rowCount: 1 };
  }

  // ── NOTIFICATIONS ────────────────────
  if (lower.includes('from notifications')) {
    let rows = [...memoryDb.notifications];
    if (lower.includes('where user_id = $1')) rows = rows.filter(n => n.user_id === parseInt(params[0], 10));
    return { rows, rowCount: rows.length };
  }

  // ── DASHBOARD AGGREGATIONS (fallback — most are now handled inside leads SELECT handler above)
  if (lower.includes('count(*) from customers') && (lower.includes('owner_id') || lower.includes('1=1'))) {
    return { rows: [{ count: memoryDb.customers.length }], rowCount: 1 };
  }
  // Legacy fallback for total_leads (should be caught by leads SELECT handler above)
  if (lower.includes('count(*) as total_leads') && lower.includes('converted_leads')) {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const leadsThisWeek = memoryDb.leads.filter(l => new Date(l.created_at) >= oneWeekAgo).length;
    return { rows: [{ total_leads: memoryDb.leads.length, converted_leads: memoryDb.leads.filter(l => l.status === 'Won' || l.converted_customer_id).length, leads_this_week: leadsThisWeek }], rowCount: 1 };
  }
  // Legacy fallback for open_opportunities — now from leads (should be caught above)
  if (lower.includes('open_opportunities') && lower.includes('pipeline_value')) {
    const openLeads = memoryDb.leads.filter(l => l.status !== 'Won' && l.status !== 'Lost');
    return { rows: [{ open_opportunities: openLeads.length, pipeline_value: openLeads.reduce((s,l)=>s+Number(l.estimated_value||0),0) }], rowCount: 1 };
  }
  if (lower.includes('total_revenue') && lower.includes('from deals') && lower.includes("stage = 'won'") && !lower.includes('group')) {
    const total = memoryDb.deals.filter(d => d.stage === 'Won').reduce((s,d) => s+Number(d.amount), 0);
    return { rows: [{ total_revenue: total }], rowCount: 1 };
  }
  if (lower.includes('monthly_revenue')) {
    const deals_won = memoryDb.deals.filter(d => d.stage === 'Won').length;
    const deals_lost = memoryDb.deals.filter(d => d.stage === 'Lost').length;
    const monthly_revenue = memoryDb.deals.filter(d => d.stage === 'Won').reduce((sum, d) => sum + Number(d.amount), 0);
    return { rows: [{ deals_won, deals_lost, monthly_revenue }], rowCount: 1 };
  }
  if (lower.includes('upcoming_followups')) {
    return { rows: [{ upcoming_followups: memoryDb.follow_ups.length }], rowCount: 1 };
  }
  if (lower.includes('pending_tasks')) {
    return { rows: [{ pending_tasks: memoryDb.tasks.filter(t => t.status !== 'Completed').length }], rowCount: 1 };
  }
  if (lower.includes('group by stage') && lower.includes('total_amount')) {
    const stages = ['New Lead', 'Contacted', 'Qualified', 'Proposal Sent', 'Negotiation', 'Won', 'Lost'];
    let rows = stages.map(s => {
      const sDeals = memoryDb.deals.filter(d => d.stage === s);
      return { stage: s, count: sDeals.length, total_amount: sDeals.reduce((sum, d) => sum + Number(d.amount), 0) };
    });
    return { rows, rowCount: rows.length };
  }
  if (lower.includes('group by to_char(updated_at') && lower.includes('month_num')) {
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const revByMonth = {};
    memoryDb.deals.filter(d => d.stage === 'Won').forEach(d => {
      const dt = new Date(d.updated_at || d.created_at);
      const mn = dt.getMonth();
      if (!revByMonth[mn]) revByMonth[mn] = 0;
      revByMonth[mn] += Number(d.amount);
    });
    const rows = Object.entries(revByMonth).sort((a,b)=>a[0]-b[0]).map(([mn, revenue]) => ({
      month: monthNames[parseInt(mn)], month_num: parseInt(mn)+1, revenue
    }));
    return { rows: rows.length ? rows : [{ month: monthNames[new Date().getMonth()], month_num: new Date().getMonth()+1, revenue: 0 }], rowCount: rows.length || 1 };
  }
  // Legacy fallback for leadsByStatus (should be caught by leads SELECT handler above)
  if (lower.includes('group by status') && lower.includes('from leads')) {
    const statusMap = {};
    memoryDb.leads.forEach(l => { statusMap[l.status] = (statusMap[l.status] || 0) + 1; });
    const rows = Object.entries(statusMap).filter(([,v])=>v>0).map(([status, value]) => ({ status, value }));
    return { rows, rowCount: rows.length };
  }
  // Legacy fallback for salesPerformance (should be caught by leads SELECT handler above)
  if (lower.includes('group by u.id') && lower.includes('won_revenue')) {
    const wonLeads = memoryDb.leads.filter(l => l.status === 'Won');
    const perfMap = {};
    wonLeads.forEach(l => {
      const u = memoryDb.users.find(u => u.id === l.assigned_to);
      if (!u) return;
      const nm = `${u.first_name} ${u.last_name}`;
      perfMap[nm] = (perfMap[nm] || 0) + Number(l.estimated_value || 0);
    });
    const rows = Object.entries(perfMap).map(([name, won_revenue]) => ({ name, won_revenue })).sort((a,b)=>b.won_revenue-a.won_revenue);
    return { rows, rowCount: rows.length };
  }
  if (lower.includes('group by to_char(created_at') && lower.includes('new_customers')) {
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const byMonth = {};
    memoryDb.customers.forEach(c => {
      const dt = new Date(c.created_at);
      const mn = dt.getMonth();
      byMonth[mn] = (byMonth[mn] || 0) + 1;
    });
    const rows = Object.entries(byMonth).sort((a,b)=>a[0]-b[0]).map(([mn, new_customers]) => ({
      month: monthNames[parseInt(mn)], month_num: parseInt(mn)+1, new_customers
    }));
    return { rows: rows.length ? rows : [{ month: monthNames[new Date().getMonth()], month_num: new Date().getMonth()+1, new_customers: 0 }], rowCount: rows.length || 1 };
  }
  if (lower.includes('group by stage') && lower.includes('stage in (')) {
    return { rows: [
      { stage: 'Won', value: memoryDb.deals.filter(d => d.stage === 'Won').length },
      { stage: 'Lost', value: memoryDb.deals.filter(d => d.stage === 'Lost').length }
    ], rowCount: 2 };
  }

  // ── REPORTS AGGREGATIONS ────────────────
  if (lower.includes('total_revenue') && lower.includes("stage = 'won'")) {
    const total = memoryDb.deals.filter(d => d.stage === 'Won').reduce((s,d) => s + Number(d.amount), 0);
    return { rows: [{ total_revenue: total }], rowCount: 1 };
  }
  if (lower.includes('deals_count') && lower.includes('total_value')) {
    const perfMap = {};
    memoryDb.deals.filter(d => d.stage === 'Won').forEach(d => {
      const u = memoryDb.users.find(u => u.id === d.assigned_to);
      const nm = u ? `${u.first_name} ${u.last_name}` : 'Unknown';
      if (!perfMap[nm]) perfMap[nm] = { name: nm, deals_count: 0, total_value: 0 };
      perfMap[nm].deals_count++;
      perfMap[nm].total_value += Number(d.amount);
    });
    const rows = Object.values(perfMap).sort((a,b) => b.total_value - a.total_value);
    return { rows, rowCount: rows.length };
  }
  if (lower.includes('new_customers') && lower.includes('mon-yyyy')) {
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const byMonth = {};
    memoryDb.customers.forEach(c => {
      const dt = new Date(c.created_at);
      const key = `${monthNames[dt.getMonth()]}-${dt.getFullYear()}`;
      byMonth[key] = (byMonth[key] || 0) + 1;
    });
    const rows = Object.entries(byMonth).map(([month, new_customers]) => ({ month, new_customers }));
    return { rows, rowCount: rows.length };
  }
  if (lower.includes('d.id, d.title, d.stage, d.amount')) {
    const rows = memoryDb.deals.map(d => {
      const u = memoryDb.users.find(u => u.id === d.assigned_to);
      return { ...d, assigned_to: u ? `${u.first_name} ${u.last_name}` : 'Unknown' };
    });
    return { rows, rowCount: rows.length };
  }
  if (lower.includes('l.id, l.name, l.company, l.status')) {
    const rows = memoryDb.leads.map(l => {
      const u = memoryDb.users.find(u => u.id === l.assigned_to);
      return { ...l, assigned_to: u ? `${u.first_name} ${u.last_name}` : 'Unknown' };
    });
    return { rows, rowCount: rows.length };
  }

  // ── NOTIFICATIONS ────────────────
  if (lower.startsWith('select') && lower.includes('from notifications')) {
    const userId = parseInt(params[0], 10);
    const rows = memoryDb.notifications.filter(n => n.user_id === userId).reverse();
    return { rows, rowCount: rows.length };
  }
  if (lower.startsWith('insert into notifications')) {
    const newId = memoryDb.notifications.length ? Math.max(...memoryDb.notifications.map(n => n.id)) + 1 : 1;
    const notification = {
      id: newId,
      user_id: parseInt(params[0], 10),
      title: params[1],
      message: params[2],
      type: params[3],
      link: params[4],
      is_read: false,
      created_at: new Date().toISOString()
    };
    memoryDb.notifications.push(notification);
    return { rows: [notification], rowCount: 1 };
  }
  if (lower.startsWith('update notifications') && lower.includes('id = $1')) {
    const id = parseInt(params[0], 10);
    const userId = parseInt(params[1], 10);
    const index = memoryDb.notifications.findIndex(n => n.id === id && n.user_id === userId);
    if (index >= 0) {
      memoryDb.notifications[index].is_read = true;
      return { rows: [memoryDb.notifications[index]], rowCount: 1 };
    }
  }
  if (lower.startsWith('update notifications') && lower.includes('user_id = $1')) {
    const userId = parseInt(params[0], 10);
    memoryDb.notifications.forEach(n => {
      if (n.user_id === userId) n.is_read = true;
    });
    return { rows: [], rowCount: 1 };
  }

  // Default: return empty result for unmatched patterns
  return { rows: [], rowCount: 0 };
}

module.exports = {
  pool,
  query,
  memoryDb,
  checkConnection,
  runMigration,
  get isConnected() { return isPgConnected; },
};
