const fs = require('fs');
const path = require('path');
const { faker } = require('@faker-js/faker');
const bcrypt = require('bcryptjs');

const generateSeed = async () => {
  console.log('Generating seed data...');

  const data = {
    users: [],
    leads: [],
    customers: [],
    contacts: [],
    deals: [],
    tasks: [],
    followups: [],
    notifications: []
  };

  const hashedPassword = await bcrypt.hash('password123', 10);
  const now = new Date().toISOString();

  // 1. Users — 5 specific named users
  data.users = [
    { id: 1, first_name: 'Dedeepya', last_name: 'Yannam', email: 'dedeepya@dedeepyatechnologies.com', password_hash: hashedPassword, role: 'Admin',           manager_id: null, phone: '+91 9000000001', is_active: true, created_at: now, updated_at: now },
    { id: 2, first_name: 'Rahul',    last_name: 'Sharma', email: 'rahul@dedeepyatechnologies.com',    password_hash: hashedPassword, role: 'Sales Manager',   manager_id: 1,    phone: '+91 9000000002', is_active: true, created_at: now, updated_at: now },
    { id: 3, first_name: 'Priya',    last_name: 'Reddy',  email: 'priya@dedeepyatechnologies.com',    password_hash: hashedPassword, role: 'Sales Executive', manager_id: 2,    phone: '+91 9000000003', is_active: true, created_at: now, updated_at: now },
    { id: 4, first_name: 'Arjun',    last_name: 'Kumar',  email: 'arjun@dedeepyatechnologies.com',    password_hash: hashedPassword, role: 'Sales Executive', manager_id: 2,    phone: '+91 9000000004', is_active: true, created_at: now, updated_at: now },
    { id: 5, first_name: 'Sneha',    last_name: 'Rao',    email: 'sneha@dedeepyatechnologies.com',    password_hash: hashedPassword, role: 'Sales Executive', manager_id: 2,    phone: '+91 9000000005', is_active: true, created_at: now, updated_at: now },
  ];


  const execIds = data.users.filter(u => u.role === 'Sales Executive').map(u => u.id);

  // 2. Leads (50)
  const leadStatuses = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL_SENT', 'NEGOTIATION', 'WON', 'LOST'];
  const leadSources = ['Website', 'Referral', 'LinkedIn', 'Cold Call', 'Trade Show', 'Partner'];
  
  for (let i = 1; i <= 50; i++) {
    const isB2B = faker.datatype.boolean();
    data.leads.push({
      id: i,
      title: isB2B ? `${faker.company.name()} Opportunity` : `${faker.person.fullName()} Interest`,
      company_name: isB2B ? faker.company.name() : '',
      contact_name: faker.person.fullName(),
      email: faker.internet.email(),
      phone: faker.phone.number(),
      source: faker.helpers.arrayElement(leadSources),
      status: faker.helpers.arrayElement(leadStatuses),
      estimated_value: faker.number.int({ min: 1000, max: 50000 }),
      assigned_to: faker.helpers.arrayElement(execIds),
      converted_customer_id: null,
      created_at: faker.date.recent({ days: 60 }).toISOString(),
      updated_at: new Date().toISOString()
    });
  }

  // 3. Customers (30) & Contacts
  for (let i = 1; i <= 30; i++) {
    data.customers.push({
      id: i,
      name: faker.company.name(),
      email: faker.internet.email(),
      phone: faker.phone.number(),
      address: faker.location.streetAddress(),
      notes: faker.company.catchPhrase(),
      lead_id: faker.datatype.boolean() ? faker.number.int({ min: 1, max: 50 }) : null,
      owner_id: faker.helpers.arrayElement(execIds),
      created_at: faker.date.past().toISOString(),
      updated_at: new Date().toISOString()
    });

    data.contacts.push({
      id: i,
      customer_id: i,
      first_name: faker.person.firstName(),
      last_name: faker.person.lastName(),
      email: faker.internet.email(),
      phone: faker.phone.number(),
      is_primary: true
    });
  }

  // 4. Deals (25)
  const pipelineStages = ['New Lead', 'Contacted', 'Qualified', 'Proposal Sent', 'Negotiation', 'Won', 'Lost'];
  for (let i = 1; i <= 25; i++) {
    const customer = faker.helpers.arrayElement(data.customers);
    const stage = faker.helpers.arrayElement(pipelineStages);
    data.deals.push({
      id: i,
      title: `${customer.name} - ${faker.commerce.productName()} License`,
      customer_id: customer.id,
      lead_id: null,
      amount: faker.number.int({ min: 5000, max: 150000 }),
      stage: stage,
      probability: stage === 'Won' ? 100 : stage === 'Lost' ? 0 : faker.number.int({ min: 10, max: 90 }),
      expected_close_date: faker.date.future().toISOString(),
      assigned_to: faker.helpers.arrayElement(execIds),
      created_at: faker.date.recent({ days: 30 }).toISOString(),
      updated_at: new Date().toISOString()
    });
  }

  // 5. Followups (40)
  const types = ['Call', 'Meeting', 'Email', 'Note', 'Demo'];
  for (let i = 1; i <= 40; i++) {
    const isDeal = faker.datatype.boolean();
    data.followups.push({
      id: i,
      customer_id: isDeal ? null : faker.helpers.arrayElement(data.customers).id,
      lead_id: isDeal ? faker.helpers.arrayElement(data.leads).id : null,
      deal_id: isDeal ? faker.helpers.arrayElement(data.deals).id : null,
      title: `Follow up - ${faker.helpers.arrayElement(types)}`,
      type: faker.helpers.arrayElement(types),
      notes: faker.lorem.sentences(2),
      follow_up_date: faker.date.recent({ days: 10 }).toISOString(),
      next_followup_date: faker.datatype.boolean() ? faker.date.soon({ days: 14 }).toISOString() : null,
      created_by: faker.helpers.arrayElement(execIds),
      created_at: new Date().toISOString()
    });
  }

  // 6. Tasks (50)
  const taskStatuses = ['Pending', 'In Progress', 'Completed'];
  const priorities = ['High', 'Medium', 'Low'];
  for (let i = 1; i <= 50; i++) {
    const isDeal = faker.datatype.boolean();
    data.tasks.push({
      id: i,
      title: faker.hacker.phrase(),
      description: faker.lorem.sentence(),
      due_date: faker.date.soon({ days: 30 }).toISOString(),
      status: faker.helpers.arrayElement(taskStatuses),
      priority: faker.helpers.arrayElement(priorities),
      assigned_to: faker.helpers.arrayElement(execIds),
      customer_id: isDeal ? null : faker.helpers.arrayElement(data.customers).id,
      lead_id: isDeal ? faker.helpers.arrayElement(data.leads).id : null,
      deal_id: isDeal ? faker.helpers.arrayElement(data.deals).id : null,
      created_at: new Date().toISOString()
    });
  }

  // 7. Notifications (30)
  for (let i = 1; i <= 30; i++) {
    data.notifications.push({
      id: i,
      user_id: faker.helpers.arrayElement(execIds),
      message: faker.company.catchPhrase(),
      type: faker.helpers.arrayElement(['Task Overdue', 'Deal Won', 'New Lead']),
      is_read: faker.datatype.boolean(),
      related_entity: 'lead',
      related_id: faker.number.int({ min: 1, max: 50 }),
      created_at: faker.date.recent({ days: 5 }).toISOString()
    });
  }

  const outPath = path.join(__dirname, '..', '..', 'seedData.json');
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
  console.log(`✅ Seed data generated successfully at ${outPath}`);
  console.log(`Entities: ${data.users.length} Users, ${data.leads.length} Leads, ${data.customers.length} Customers, ${data.deals.length} Deals`);
};

generateSeed().catch(console.error);
