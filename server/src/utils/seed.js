const bcrypt = require('bcryptjs');
const db = require('../config/db');
const fs = require('fs');
const path = require('path');

async function seedDatabase() {
  console.log('--- Starting CRM Database Initialization & Seeding ---');

  try {
    const isConnected = await db.checkConnection();
    if (!isConnected) {
      console.log('Skipping PostgreSQL live seeding (PostgreSQL not active or reachable on port 5432).');
      return;
    }

    // Execute schema.sql
    const schemaPath = path.join(__dirname, '../config/schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await db.query(schemaSql);
    console.log('✅ Database Schema DDL executed successfully.');

    // Clear existing data in reverse order of foreign keys
    await db.query('TRUNCATE audit_logs, notifications, follow_ups, tasks, deals, contacts, leads, customers, users RESTART IDENTITY CASCADE;');

    // Hashed Passwords
    const passwordHash = await bcrypt.hash('password123', 10);

    // 1. Seed Users
    const usersResult = await db.query(`
      INSERT INTO users (first_name, last_name, email, password_hash, role, manager_id, phone)
      VALUES 
        ('Sarah', 'Connor', 'admin@crm.com', $1, 'Admin', NULL, '+1 555-0101'),
        ('Marcus', 'Vance', 'manager@crm.com', $1, 'Sales Manager', 1, '+1 555-0102'),
        ('Alex', 'Mercer', 'alex@crm.com', $1, 'Sales Executive', 2, '+1 555-0103'),
        ('Elena', 'Rostova', 'elena@crm.com', $1, 'Sales Executive', 2, '+1 555-0104'),
        ('David', 'Kim', 'david@crm.com', $1, 'Sales Executive', 2, '+1 555-0105')
      RETURNING id, role, first_name, email;
    `, [passwordHash]);

    console.log(`✅ Seeded ${usersResult.rows.length} Users (Admin: admin@crm.com, Manager: manager@crm.com, Executive: alex@crm.com / password123).`);

    // 2. Seed Customers (Company Accounts)
    const customersResult = await db.query(`
      INSERT INTO customers (name, industry, website, email, phone, address, city, country, owner_id)
      VALUES
        ('Acme Technologies', 'Software & IT', 'https://acmetech.io', 'info@acmetech.io', '+1 800-555-0199', '100 Silicon Way', 'San Francisco', 'USA', 3),
        ('Global Logistics Corp', 'Transportation', 'https://globallogistics.com', 'contact@globallogistics.com', '+1 800-555-0200', '450 Harbor Blvd', 'Seattle', 'USA', 4),
        ('Apex Financial Group', 'Banking & Finance', 'https://apexfinancial.com', 'services@apexfinancial.com', '+1 800-555-0300', '1 Wall Street', 'New York', 'USA', 3),
        ('Vanguard Healthcare', 'Healthcare', 'https://vanguardhealth.org', 'support@vanguardhealth.org', '+1 800-555-0400', '88 Health Ave', 'Boston', 'USA', 5),
        ('Nexus Cloud Systems', 'Cloud & Hosting', 'https://nexuscloud.net', 'hello@nexuscloud.net', '+1 800-555-0500', '500 Innovation Park', 'Austin', 'USA', 4)
      RETURNING id, name;
    `);

    console.log(`✅ Seeded ${customersResult.rows.length} Customer Accounts.`);

    // 3. Seed Contacts
    await db.query(`
      INSERT INTO contacts (customer_id, first_name, last_name, email, phone, job_title, is_primary)
      VALUES
        (1, 'John', 'Doe', 'john.doe@acmetech.io', '+1 555-9011', 'Chief Technology Officer', true),
        (1, 'Jane', 'Smith', 'jane.smith@acmetech.io', '+1 555-9012', 'VP of Engineering', false),
        (2, 'Robert', 'Lang', 'rlang@globallogistics.com', '+1 555-9021', 'Head of Supply Chain', true),
        (3, 'Victoria', 'Sterling', 'vsterling@apexfinancial.com', '+1 555-9031', 'Director of Operations', true),
        (4, 'Dr. Alan', 'Grant', 'agrant@vanguardhealth.org', '+1 555-9041', 'Chief Medical Information Officer', true),
        (5, 'Samantha', 'Wright', 'swright@nexuscloud.net', '+1 555-9051', 'CEO', true);
    `);

    console.log('✅ Seeded Customer Contacts.');

    // 4. Seed Leads (Across various statuses)
    const leadsResult = await db.query(`
      INSERT INTO leads (title, company_name, contact_name, email, phone, source, status, estimated_value, assigned_to, notes)
      VALUES
        ('Enterprise Cloud Migration', 'CyberDyne Systems', 'Miles Dyson', 'mdyson@cyberdyne.io', '+1 555-7701', 'Website Inquiry', 'New Lead', 120000.00, 3, 'Inquired about migrating on-prem infrastructure to multi-cloud.'),
        ('CRM Modernization Project', 'Stark Industries', 'Pepper Potts', 'pep@starkind.com', '+1 555-7702', 'Referral', 'Contacted', 85000.00, 4, 'Had initial discovery call. Requesting product overview deck.'),
        ('AI Analytics Suite', 'Wayne Enterprises', 'Lucius Fox', 'lfox@wayneent.com', '+1 555-7703', 'LinkedIn Outbound', 'Qualified', 250000.00, 3, 'Budget confirmed. Technical decision maker meeting scheduled.'),
        ('Security Audit Contract', 'Umbrella Corp', 'Albert Wesker', 'awesker@umbrella.com', '+1 555-7704', 'Trade Show', 'Proposal Sent', 45000.00, 5, 'Sent formal security compliance proposal. Awaiting procurement response.'),
        ('Fleet Management Software', 'Initech Solutions', 'Peter Gibbons', 'pgibbons@initech.com', '+1 555-7705', 'Direct Call', 'Negotiation', 60000.00, 4, 'Final price negotiation in progress for 500 licenses.'),
        ('SaaS Infrastructure Deal', 'Massive Dynamic', 'Nina Sharp', 'nsharp@massivedynamic.com', '+1 555-7706', 'Partner', 'Won', 180000.00, 3, 'Contract signed! Lead converted into active deal.'),
        ('Legacy Database Upgrade', 'Hooli Inc', 'Gavin Belson', 'gbelson@hooli.com', '+1 555-7707', 'Website Inquiry', 'Lost', 35000.00, 5, 'Decided to defer project until next fiscal year.')
      RETURNING id, title;
    `);

    console.log(`✅ Seeded ${leadsResult.rows.length} Leads.`);

    // 5. Seed Deals (Across 7 Sales Pipeline Stages)
    const dealsResult = await db.query(`
      INSERT INTO deals (title, customer_id, lead_id, amount, stage, probability, expected_close_date, assigned_to)
      VALUES
        ('Acme ERP Integration Phase 1', 1, 1, 150000.00, 'New Lead', 20, '2026-09-30', 3),
        ('Global Logistics Dispatch System', 2, 2, 95000.00, 'Contacted', 35, '2026-10-15', 4),
        ('Apex Financial Risk Platform', 3, 3, 320000.00, 'Qualified', 50, '2026-11-01', 3),
        ('Vanguard Patient Portal Expansion', 4, 4, 180000.00, 'Proposal Sent', 70, '2026-08-31', 5),
        ('Nexus Cloud Hybrid Architecture', 5, 5, 210000.00, 'Negotiation', 85, '2026-08-25', 4),
        ('Acme Security Enhancements', 1, NULL, 75000.00, 'Won', 100, '2026-07-15', 3),
        ('Global Fleet Tracking Add-on', 2, NULL, 40000.00, 'Lost', 0, '2026-06-30', 4)
      RETURNING id, title, stage, amount;
    `);

    console.log(`✅ Seeded ${dealsResult.rows.length} Pipeline Deals.`);

    // 6. Seed Tasks
    await db.query(`
      INSERT INTO tasks (title, description, due_date, status, priority, assigned_to, created_by, lead_id, deal_id, customer_id)
      VALUES
        ('Follow up with Miles Dyson', 'Send technical documentation on cloud migration security.', NOW() + INTERVAL '1 day', 'Pending', 'High', 3, 1, 1, 1, 1),
        ('Prepare Custom Proposal Deck', 'Draft tailored proposal for Vanguard Patient Portal project.', NOW() + INTERVAL '2 days', 'In Progress', 'Urgent', 5, 2, 4, 4, 4),
        ('Schedule Product Demo', 'Conduct live demonstration of risk platform features for Apex team.', NOW() + INTERVAL '3 days', 'Pending', 'Medium', 3, 2, 3, 3, 3),
        ('Review Contract Terms', 'Finalize legal clause reviews for Nexus Cloud agreement.', NOW() - INTERVAL '1 day', 'Completed', 'High', 4, 1, 5, 5, 5),
        ('Send Quarterly Account Review', 'Check in with Acme Technologies primary contact.', NOW() + INTERVAL '5 days', 'Pending', 'Low', 3, 1, NULL, 6, 1);
    `);

    console.log('✅ Seeded Tasks.');

    // 7. Seed Follow-ups / Activity Logs
    await db.query(`
      INSERT INTO follow_ups (title, type, notes, follow_up_date, user_id, lead_id, deal_id, customer_id)
      VALUES
        ('Initial Discovery Call', 'Call', 'Discussed current infrastructure bottlenecks and budget scope.', NOW() - INTERVAL '3 days', 3, 1, 1, 1),
        ('Product Demo Meeting', 'Meeting', 'Demonstrated core analytics capabilities to executive team.', NOW() - INTERVAL '2 days', 4, 2, 2, 2),
        ('Proposal Email Sent', 'Email', 'Sent updated enterprise pricing proposal with custom add-ons.', NOW() - INTERVAL '1 day', 5, 4, 4, 4),
        ('Contract Negotiation Notes', 'Note', 'Customer requested 5% discount for 3-year term commitment.', NOW() - INTERVAL '5 hours', 4, 5, 5, 5);
    `);

    console.log('✅ Seeded Activity Follow-ups.');

    // 8. Seed Notifications
    await db.query(`
      INSERT INTO notifications (user_id, title, message, type, is_read, link)
      VALUES
        (3, 'New Lead Assigned', 'You have been assigned to lead "Enterprise Cloud Migration".', 'lead_assignment', false, '/leads'),
        (3, 'High Priority Task Due Soon', 'Task "Follow up with Miles Dyson" is due tomorrow.', 'task_due', false, '/tasks'),
        (4, 'Deal Stage Updated', 'Deal "Nexus Cloud Hybrid Architecture" moved to Negotiation.', 'deal_update', true, '/pipeline'),
        (5, 'Proposal Action Required', 'Prepare proposal deck for Vanguard Patient Portal.', 'task_due', false, '/tasks');
    `);

    console.log('✅ Seeded System Notifications.');

    console.log('🎉 Enterprise CRM Database successfully initialized and seeded with demo data!');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    process.exit(0);
  }
}

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
