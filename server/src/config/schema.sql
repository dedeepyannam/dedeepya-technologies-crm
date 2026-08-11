-- ============================================================
-- Enterprise CRM System — PostgreSQL Database Schema
-- Phase 2 | Version 2.0
-- ============================================================
-- Tables:
--   1. users          — Sales team members with role hierarchy
--   2. customers      — Company / Account records
--   3. contacts       — Individual contacts under a customer
--   4. leads          — Unqualified inbound / outbound prospects
--   5. deals          — Sales pipeline opportunities (qualified leads)
--   6. tasks          — Actionable follow-up items
--   7. follow_ups     — Activity / interaction log
--   8. notifications  — In-app user alerts
--   9. audit_logs     — Immutable change history
-- ============================================================

-- ─────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('Admin', 'Sales Manager', 'Sales Executive');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE lead_status AS ENUM (
        'New Lead', 'Contacted', 'Qualified',
        'Proposal Sent', 'Negotiation', 'Won', 'Lost'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE deal_stage AS ENUM (
        'New Lead', 'Contacted', 'Qualified',
        'Proposal Sent', 'Negotiation', 'Won', 'Lost'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE task_status AS ENUM ('Pending', 'In Progress', 'Completed', 'Cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE task_priority AS ENUM ('Low', 'Medium', 'High', 'Urgent');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE activity_type AS ENUM ('Call', 'Meeting', 'Email', 'Note', 'Demo');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─────────────────────────────────────────
-- AUTO-UPDATE TRIGGER FUNCTION
-- Automatically sets updated_at = NOW() on
-- every UPDATE for any table that uses it.
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────
-- TABLE 1: users
-- ─────────────────────────────────────────
-- Stores all CRM system users.
-- Roles: Admin > Sales Manager > Sales Executive
-- Self-referencing manager_id creates the org hierarchy.
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id              SERIAL          PRIMARY KEY,
    first_name      VARCHAR(50)     NOT NULL,
    last_name       VARCHAR(50)     NOT NULL,
    email           VARCHAR(100)    NOT NULL UNIQUE,
    password_hash   VARCHAR(255)    NOT NULL,
    role            user_role       NOT NULL DEFAULT 'Sales Executive',
    manager_id      INT             REFERENCES users(id) ON DELETE SET NULL,
    phone           VARCHAR(20),
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE TRIGGER set_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ─────────────────────────────────────────
-- TABLE 2: customers
-- ─────────────────────────────────────────
-- Company / Account records.
-- Each customer is "owned" by a sales user (owner_id).
-- Relationship: users ->< customers (one user owns many customers)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
    id          SERIAL          PRIMARY KEY,
    lead_id     INT             REFERENCES leads(id) ON DELETE SET NULL,
    name        VARCHAR(100)    NOT NULL,
    industry    VARCHAR(50),
    website     VARCHAR(150),
    email       VARCHAR(100),
    phone       VARCHAR(20),
    address     TEXT,
    city        VARCHAR(50),
    country     VARCHAR(50)     NOT NULL DEFAULT 'USA',
    notes       TEXT,
    owner_id    INT             REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE TRIGGER set_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ─────────────────────────────────────────
-- TABLE 3: contacts
-- ─────────────────────────────────────────
-- Individual people (employees) at a customer company.
-- Relationship: customers ->< contacts (one company has many contacts)
-- CASCADE delete: if the company is deleted, all contacts are removed.
-- Only one contact per customer can be is_primary = TRUE
-- (enforced via partial unique index).
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contacts (
    id              SERIAL          PRIMARY KEY,
    customer_id     INT             NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    first_name      VARCHAR(50)     NOT NULL,
    last_name       VARCHAR(50)     NOT NULL,
    email           VARCHAR(100),
    phone           VARCHAR(20),
    job_title       VARCHAR(100),
    is_primary      BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE TRIGGER set_contacts_updated_at
    BEFORE UPDATE ON contacts
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Enforce only one primary contact per customer
CREATE UNIQUE INDEX IF NOT EXISTS uidx_contacts_primary_per_customer
    ON contacts(customer_id) WHERE is_primary = TRUE;

-- ─────────────────────────────────────────
-- TABLE 4: leads
-- ─────────────────────────────────────────
-- Unqualified prospects at the top of the sales funnel.
-- A lead progresses through statuses (New Lead -> Won/Lost).
-- When won, a lead is converted: converted_customer_id is set.
-- Relationship: users    ->< leads (assigned_to)
--               leads    ->  customers (converted_customer_id, optional)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
    id                      SERIAL          PRIMARY KEY,
    title                   VARCHAR(150)    NOT NULL,
    company_name            VARCHAR(100),
    contact_name            VARCHAR(100)    NOT NULL,
    email                   VARCHAR(100)    NOT NULL,
    phone                   VARCHAR(20),
    source                  VARCHAR(50)     NOT NULL DEFAULT 'Direct',
    status                  lead_status     NOT NULL DEFAULT 'New Lead',
    estimated_value         NUMERIC(12, 2)  NOT NULL DEFAULT 0.00,
    assigned_to             INT             REFERENCES users(id) ON DELETE SET NULL,
    converted_customer_id   INT             REFERENCES customers(id) ON DELETE SET NULL,
    notes                   TEXT,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_leads_estimated_value CHECK (estimated_value >= 0)
);

CREATE OR REPLACE TRIGGER set_leads_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ─────────────────────────────────────────
-- TABLE 5: deals  (Sales Pipeline Opportunities)
-- ─────────────────────────────────────────
-- Qualified opportunities in the active sales pipeline.
-- Each deal belongs to a customer and optionally traces back to a lead.
-- Relationship: customers ->< deals  (one customer has many deals)
--               leads    ->< deals   (one lead can spawn one or more deals)
--               users    ->< deals   (assigned_to)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deals (
    id                  SERIAL          PRIMARY KEY,
    title               VARCHAR(150)    NOT NULL,
    customer_id         INT             NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    lead_id             INT             REFERENCES leads(id) ON DELETE SET NULL,
    amount              NUMERIC(12, 2)  NOT NULL DEFAULT 0.00,
    stage               deal_stage      NOT NULL DEFAULT 'New Lead',
    probability         SMALLINT        NOT NULL DEFAULT 10,
    expected_close_date DATE,
    assigned_to         INT             REFERENCES users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_deals_amount      CHECK (amount >= 0),
    CONSTRAINT chk_deals_probability CHECK (probability BETWEEN 0 AND 100)
);

CREATE OR REPLACE TRIGGER set_deals_updated_at
    BEFORE UPDATE ON deals
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ─────────────────────────────────────────
-- TABLE 6: tasks
-- ─────────────────────────────────────────
-- Actionable to-do items assigned to a user.
-- A task can be linked to a lead, deal, and/or customer (all optional).
-- Relationship: users     ->< tasks  (assigned_to, created_by)
--               leads     ->< tasks  (lead_id, optional)
--               deals     ->< tasks  (deal_id, optional)
--               customers ->< tasks  (customer_id, optional)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
    id              SERIAL          PRIMARY KEY,
    title           VARCHAR(150)    NOT NULL,
    description     TEXT,
    due_date        TIMESTAMPTZ     NOT NULL,
    status          task_status     NOT NULL DEFAULT 'Pending',
    priority        task_priority   NOT NULL DEFAULT 'Medium',
    assigned_to     INT             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_by      INT             REFERENCES users(id) ON DELETE SET NULL,
    lead_id         INT             REFERENCES leads(id) ON DELETE SET NULL,
    deal_id         INT             REFERENCES deals(id) ON DELETE SET NULL,
    customer_id     INT             REFERENCES customers(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE TRIGGER set_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ─────────────────────────────────────────
-- TABLE 7: follow_ups
-- ─────────────────────────────────────────
-- Immutable activity / interaction log (calls, meetings, emails, notes).
-- Records every touchpoint with leads, deals, or customers.
-- Relationship: users     ->< follow_ups  (user_id -- who logged it)
--               leads     ->< follow_ups  (lead_id, optional)
--               deals     ->< follow_ups  (deal_id, optional)
--               customers ->< follow_ups  (customer_id, optional)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS follow_ups (
    id              SERIAL          PRIMARY KEY,
    title           VARCHAR(150)    NOT NULL,
    type            activity_type   NOT NULL DEFAULT 'Call',
    notes           TEXT,
    follow_up_date  TIMESTAMPTZ     NOT NULL,
    user_id         INT             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lead_id         INT             REFERENCES leads(id) ON DELETE SET NULL,
    deal_id         INT             REFERENCES deals(id) ON DELETE SET NULL,
    customer_id     INT             REFERENCES customers(id) ON DELETE SET NULL,
    next_followup_date TIMESTAMPTZ,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP
    -- No updated_at: activity log entries are immutable once created
);

-- ─────────────────────────────────────────
-- TABLE 8: notifications
-- ─────────────────────────────────────────
-- In-app alerts delivered to specific users.
-- Relationship: users ->< notifications (one user has many notifications)
-- CASCADE delete: when user is deleted, their notifications are removed.
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
    id          SERIAL          PRIMARY KEY,
    user_id     INT             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       VARCHAR(150)    NOT NULL,
    message     TEXT            NOT NULL,
    type        VARCHAR(50)     NOT NULL DEFAULT 'info',
    is_read     BOOLEAN         NOT NULL DEFAULT FALSE,
    link        VARCHAR(255),
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP
    -- No updated_at: marking as read is a flag flip, not an edit
);

-- ─────────────────────────────────────────
-- TABLE 9: audit_logs
-- ─────────────────────────────────────────
-- Immutable append-only record of every meaningful data change.
-- Relationship: users ->< audit_logs (user_id, nullable -- system actions allowed)
-- No CASCADE on user delete: logs must be preserved even if user is removed.
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
    id          SERIAL          PRIMARY KEY,
    user_id     INT             REFERENCES users(id) ON DELETE SET NULL,
    action      VARCHAR(100)    NOT NULL,
    entity      VARCHAR(50)     NOT NULL,
    entity_id   INT,
    details     JSONB,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP
    -- Immutable: no updated_at, no UPDATE ever permitted
);

-- ═══════════════════════════════════════════
-- PERFORMANCE INDEXES
-- ═══════════════════════════════════════════

-- users
CREATE INDEX IF NOT EXISTS idx_users_email        ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role         ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_manager      ON users(manager_id);

-- customers
CREATE INDEX IF NOT EXISTS idx_customers_owner    ON customers(owner_id);
CREATE INDEX IF NOT EXISTS idx_customers_country  ON customers(country);

-- contacts
CREATE INDEX IF NOT EXISTS idx_contacts_customer  ON contacts(customer_id);

-- leads
CREATE INDEX IF NOT EXISTS idx_leads_assigned     ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_status       ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_source       ON leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_converted    ON leads(converted_customer_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_at   ON leads(created_at DESC);

-- deals
CREATE INDEX IF NOT EXISTS idx_deals_customer     ON deals(customer_id);
CREATE INDEX IF NOT EXISTS idx_deals_lead         ON deals(lead_id);
CREATE INDEX IF NOT EXISTS idx_deals_assigned     ON deals(assigned_to);
CREATE INDEX IF NOT EXISTS idx_deals_stage        ON deals(stage);
CREATE INDEX IF NOT EXISTS idx_deals_close_date   ON deals(expected_close_date);

-- tasks
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_status  ON tasks(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date         ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_lead             ON tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_tasks_deal             ON tasks(deal_id);
CREATE INDEX IF NOT EXISTS idx_tasks_customer         ON tasks(customer_id);
CREATE INDEX IF NOT EXISTS idx_tasks_priority         ON tasks(priority);

-- follow_ups
CREATE INDEX IF NOT EXISTS idx_followups_user         ON follow_ups(user_id);
CREATE INDEX IF NOT EXISTS idx_followups_lead         ON follow_ups(lead_id);
CREATE INDEX IF NOT EXISTS idx_followups_deal         ON follow_ups(deal_id);
CREATE INDEX IF NOT EXISTS idx_followups_customer     ON follow_ups(customer_id);
CREATE INDEX IF NOT EXISTS idx_followups_date         ON follow_ups(follow_up_date DESC);

-- notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_user_all    ON notifications(user_id, created_at DESC);

-- audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_entity       ON audit_logs(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_user         ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at   ON audit_logs(created_at DESC);

DO $$ BEGIN
    CREATE TYPE lead_status AS ENUM ('New Lead', 'Contacted', 'Qualified', 'Proposal Sent', 'Negotiation', 'Won', 'Lost');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE deal_stage AS ENUM ('New Lead', 'Contacted', 'Qualified', 'Proposal Sent', 'Negotiation', 'Won', 'Lost');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE task_status AS ENUM ('Pending', 'In Progress', 'Completed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE task_priority AS ENUM ('Low', 'Medium', 'High', 'Urgent');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE activity_type AS ENUM ('Call', 'Meeting', 'Email', 'Note', 'Demo');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'Sales Executive',
    manager_id INT REFERENCES users(id) ON DELETE SET NULL,
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. CUSTOMERS TABLE (Companies / Accounts)
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    industry VARCHAR(50),
    website VARCHAR(150),
    email VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(50),
    country VARCHAR(50),
    owner_id INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. CONTACTS TABLE (Individuals under Customers)
CREATE TABLE IF NOT EXISTS contacts (
    id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    job_title VARCHAR(50),
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. LEADS TABLE
CREATE TABLE IF NOT EXISTS leads (
    id SERIAL PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    company_name VARCHAR(100),
    contact_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    source VARCHAR(50) DEFAULT 'Direct',
    status lead_status NOT NULL DEFAULT 'New Lead',
    estimated_value NUMERIC(12, 2) DEFAULT 0.00,
    assigned_to INT REFERENCES users(id) ON DELETE SET NULL,
    converted_customer_id INT REFERENCES customers(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. DEALS TABLE (Sales Pipeline)
CREATE TABLE IF NOT EXISTS deals (
    id SERIAL PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    customer_id INT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    lead_id INT REFERENCES leads(id) ON DELETE SET NULL,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    stage deal_stage NOT NULL DEFAULT 'New Lead',
    probability INT DEFAULT 10,
    expected_close_date DATE,
    assigned_to INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. TASKS TABLE
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status task_status NOT NULL DEFAULT 'Pending',
    priority task_priority NOT NULL DEFAULT 'Medium',
    assigned_to INT REFERENCES users(id) ON DELETE CASCADE,
    created_by INT REFERENCES users(id) ON DELETE SET NULL,
    lead_id INT REFERENCES leads(id) ON DELETE CASCADE,
    deal_id INT REFERENCES deals(id) ON DELETE CASCADE,
    customer_id INT REFERENCES customers(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. FOLLOW_UPS TABLE
CREATE TABLE IF NOT EXISTS follow_ups (
    id SERIAL PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    type activity_type NOT NULL DEFAULT 'Call',
    notes TEXT,
    follow_up_date TIMESTAMP WITH TIME ZONE NOT NULL,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    lead_id INT REFERENCES leads(id) ON DELETE CASCADE,
    deal_id INT REFERENCES deals(id) ON DELETE CASCADE,
    customer_id INT REFERENCES customers(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    link VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity VARCHAR(50) NOT NULL,
    entity_id INT,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_leads_assigned ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage);
CREATE INDEX IF NOT EXISTS idx_deals_assigned ON deals(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_status ON tasks(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
