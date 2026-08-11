import React, { useEffect, useState } from 'react';
import API from '../services/api';
import { Plus, Clock, AlertTriangle, Calendar, Edit2, Trash2 } from 'lucide-react';

const TasksPage = () => {
  const [tasks, setTasks] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);

  const [newTask, setNewTask] = useState({
    title: '', description: '', due_date: '', priority: 'Medium', status: 'Pending'
  });

  const fetchTasks = async () => {
    try {
      let url = '/tasks?';
      if (statusFilter) url += `status=${encodeURIComponent(statusFilter)}`;
      const res = await API.get(url);
      if (res.data.success) {
        setTasks(res.data.tasks);
      }
    } catch (err) {
      console.error('Error loading tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [statusFilter]);

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await API.patch(`/tasks/${taskId}/status`, { status: newStatus });
      fetchTasks();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update task status.');
    }
  };

  const handleDelete = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await API.delete(`/tasks/${taskId}`);
      fetchTasks();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete task.');
    }
  };

  const handleEditClick = (task) => {
    setNewTask({
      title: task.title,
      description: task.description || '',
      due_date: new Date(task.due_date).toISOString().split('T')[0],
      priority: task.priority,
      status: task.status
    });
    setEditId(task.id);
    setIsEditing(true);
    setShowModal(true);
  };

  const handleCreateOrUpdateSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await API.put(`/tasks/${editId}`, newTask);
      } else {
        await API.post('/tasks', newTask);
      }
      
      setShowModal(false);
      setNewTask({ title: '', description: '', due_date: '', priority: 'Medium', status: 'Pending' });
      setIsEditing(false);
      setEditId(null);
      fetchTasks();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save task.');
    }
  };

  const priorityBadgeMap = {
    'Low': 'badge-purple',
    'Medium': 'badge-info',
    'High': 'badge-warning',
    'Urgent': 'badge-danger'
  };

  const now = new Date();
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(now.getDate() + 3);

  const overdueTasks = tasks.filter(t => t.status !== 'Completed' && new Date(t.due_date) < now);
  const upcomingTasks = tasks.filter(t => t.status !== 'Completed' && new Date(t.due_date) >= now && new Date(t.due_date) <= threeDaysFromNow);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Task Management</h1>
          <p className="page-subtitle">Schedule, assign, and execute follow-up sales activities.</p>
        </div>
        <button onClick={() => {
          setIsEditing(false);
          setNewTask({ title: '', description: '', due_date: '', priority: 'Medium', status: 'Pending' });
          setShowModal(true);
        }} className="btn btn-primary">
          <Plus size={18} />
          <span>New Task</span>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger)', borderRadius: '0.75rem', padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: '#fef2f2', color: '#ef4444', padding: '0.75rem', borderRadius: '50%' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ef4444' }}>{overdueTasks.length}</div>
            <div style={{ fontSize: '0.85rem', color: '#b91c1c', fontWeight: 600 }}>Overdue Tasks</div>
          </div>
        </div>
        
        <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '0.75rem', padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: '#fef3c7', color: '#f59e0b', padding: '0.75rem', borderRadius: '50%' }}>
            <Clock size={24} />
          </div>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f59e0b' }}>{upcomingTasks.length}</div>
            <div style={{ fontSize: '0.85rem', color: '#b45309', fontWeight: 600 }}>Due within 3 Days</div>
          </div>
        </div>
      </div>

      <div className="filter-bar">
        <select className="form-select" style={{ maxWidth: '300px' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Task Statuses</option>
          <option value="Pending">Pending</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
        </select>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Task Title</th>
              <th>Due Date</th>
              <th>Priority</th>
              <th>Status Stage</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" className="text-center p-md">
                  <div className="loading-spinner"></div>
                </td>
              </tr>
            ) : tasks.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center p-md">
                  <div className="empty-state">
                    <CheckSquare size={48} className="empty-icon" />
                    <h3 className="empty-title">No Tasks Found</h3>
                    <p className="empty-subtitle">You have no tasks matching this filter.</p>
                  </div>
                </td>
              </tr>
            ) : (
              tasks.map(t => (
                <tr key={t.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{t.title}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t.description || 'No description'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '0.25rem' }}>
                      {t.customer_name ? `🏢 ${t.customer_name}` : ''} {t.deal_title ? ` | 💼 ${t.deal_title}` : ''}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem', color: (t.status !== 'Completed' && new Date(t.due_date) < now) ? '#ef4444' : 'inherit' }}>
                      <Calendar size={14} className={t.status !== 'Completed' && new Date(t.due_date) < now ? "text-red-500" : "text-slate-400"} />
                      {new Date(t.due_date).toLocaleDateString()}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${priorityBadgeMap[t.priority] || ''}`}>{t.priority}</span>
                  </td>
                  <td>
                    <select 
                      value={t.status} 
                      onChange={e => handleStatusChange(t.id, e.target.value)}
                      className="form-select"
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', background: 'var(--bg-dark)' }}
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => handleEditClick(t)} className="btn btn-secondary" style={{ padding: '0.4rem' }}>
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => handleDelete(t.id)} className="btn btn-danger" style={{ padding: '0.4rem' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content card-neon" style={{ maxWidth: '500px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>{isEditing ? 'Edit Task' : 'Create Task'}</h2>
            <form onSubmit={handleCreateOrUpdateSubmit}>
              <div className="form-group">
                <label className="form-label">Task Title *</label>
                <input type="text" className="form-input" required value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" rows="3" value={newTask.description} onChange={e => setNewTask({ ...newTask, description: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Due Date *</label>
                  <input type="date" className="form-input" required value={newTask.due_date} onChange={e => setNewTask({ ...newTask, due_date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select className="form-select" value={newTask.priority} onChange={e => setNewTask({ ...newTask, priority: e.target.value })}>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={newTask.status} onChange={e => setNewTask({ ...newTask, status: e.target.value })}>
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Save Task</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TasksPage;
