const db = require('../config/db');

// @desc    Get all Tasks
// @route   GET /api/v1/tasks
// @access  Private
const getTasks = async (req, res, next) => {
  try {
    const { status, priority, assigned_to } = req.query;

    let queryText = `
      SELECT t.*, 
             u.first_name as assigned_first_name, 
             u.last_name as assigned_last_name,
             c.name as customer_name,
             l.title as lead_title,
             d.title as deal_title
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN customers c ON t.customer_id = c.id
      LEFT JOIN leads l ON t.lead_id = l.id
      LEFT JOIN deals d ON t.deal_id = d.id
    `;

    let whereClauses = [];
    let params = [];
    let paramIndex = 1;

    // RBAC Scoping
    if (req.user.role === 'Sales Executive') {
      whereClauses.push(`t.assigned_to = $${paramIndex}`);
      params.push(req.user.id);
      paramIndex++;
    } else if (req.user.role === 'Sales Manager') {
      whereClauses.push(`(t.assigned_to IN (SELECT id FROM users WHERE manager_id = $${paramIndex} OR id = $${paramIndex}))`);
      params.push(req.user.id);
      paramIndex++;
    }

    if (status) {
      whereClauses.push(`t.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (priority) {
      whereClauses.push(`t.priority = $${paramIndex}`);
      params.push(priority);
      paramIndex++;
    }

    if (assigned_to) {
      whereClauses.push(`t.assigned_to = $${paramIndex}`);
      params.push(parseInt(assigned_to, 10));
      paramIndex++;
    }

    if (whereClauses.length > 0) {
      queryText += ' WHERE ' + whereClauses.join(' AND ');
    }

    queryText += ' ORDER BY t.due_date ASC';

    const result = await db.query(queryText, params);

    res.status(200).json({
      success: true,
      count: result.rows.length,
      tasks: result.rows
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new Task
// @route   POST /api/v1/tasks
// @access  Private
const createTask = async (req, res, next) => {
  try {
    const { title, description, due_date, status, priority, assigned_to, lead_id, deal_id, customer_id } = req.body;

    if (!title || !due_date) {
      return res.status(400).json({ success: false, error: 'Task title and due date are required.' });
    }

    const taskAssignee = assigned_to || req.user.id;

    const result = await db.query(`
      INSERT INTO tasks (title, description, due_date, status, priority, assigned_to, created_by, lead_id, deal_id, customer_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;
    `, [
      title,
      description || '',
      due_date,
      status || 'Pending',
      priority || 'Medium',
      taskAssignee,
      req.user.id,
      lead_id ? parseInt(lead_id, 10) : null,
      deal_id ? parseInt(deal_id, 10) : null,
      customer_id ? parseInt(customer_id, 10) : null
    ]);

    // Send task assignment notification
    if (taskAssignee !== req.user.id) {
      await db.query(`
        INSERT INTO notifications (user_id, title, message, type, link)
        VALUES ($1, $2, $3, $4, $5);
      `, [
        taskAssignee,
        'New Task Assigned',
        `Task "${title}" assigned to you, due ${new Date(due_date).toLocaleDateString()}.`,
        'task_due',
        '/tasks'
      ]);
    }

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      task: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Task Status (Pending -> In Progress -> Completed)
// @route   PATCH /api/v1/tasks/:id/status
// @access  Private
const updateTaskStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['Pending', 'In Progress', 'Completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid task status.' });
    }

    const result = await db.query(`
      UPDATE tasks
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *;
    `, [status, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Task not found.' });
    }

    res.status(200).json({
      success: true,
      message: `Task status updated to ${status}`,
      task: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Task Details
// @route   PUT /api/v1/tasks/:id
// @access  Private
const updateTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, due_date, status, priority } = req.body;

    if (!title || !due_date) {
      return res.status(400).json({ success: false, error: 'Task title and due date are required.' });
    }

    const result = await db.query(`
      UPDATE tasks
      SET status = $1, title = $2, description = $3, due_date = $4, priority = $5, updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *;
    `, [status || 'Pending', title, description || '', due_date, priority || 'Medium', id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Task not found.' });
    }

    res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      task: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete Task
// @route   DELETE /api/v1/tasks/:id
// @access  Private
const deleteTask = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await db.query(`
      DELETE FROM tasks
      WHERE id = $1
      RETURNING id;
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Task not found.' });
    }

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTasks,
  createTask,
  updateTaskStatus,
  updateTask,
  deleteTask
};
