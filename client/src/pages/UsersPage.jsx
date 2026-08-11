import React, { useEffect, useState } from 'react';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Plus, Users, UserPlus, Shield, CheckCircle, XCircle } from 'lucide-react';

const UsersPage = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [newUser, setNewUser] = useState({
    first_name: '', last_name: '', email: '', password: 'password123', role: 'Sales Executive', phone: ''
  });

  const fetchUsers = async () => {
    try {
      const res = await API.get('/users');
      if (res.data.success) {
        setUsers(res.data.users);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleStatus = async (userId, currentStatus) => {
    try {
      await API.patch(`/users/${userId}/status`, { is_active: !currentStatus });
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update user status.');
    }
  };

  const handleCreateUserSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post('/users', newUser);
      if (res.data.success) {
        setShowModal(false);
        setNewUser({ first_name: '', last_name: '', email: '', password: 'password123', role: 'Sales Executive', phone: '' });
        fetchUsers();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create user.');
    }
  };

  const roleClassMap = {
    'Admin': 'role-admin',
    'Sales Manager': 'role-manager',
    'Sales Executive': 'role-executive'
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">User & Team Management</h1>
          <p className="page-subtitle">Manage organization accounts, user roles, hierarchy, and access permissions.</p>
        </div>
        {currentUser?.role === 'Admin' && (
          <button onClick={() => setShowModal(true)} className="btn btn-primary">
            <UserPlus size={18} />
            <span>Add Team Member</span>
          </button>
        )}
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>User Name</th>
              <th>Email</th>
              <th>System Role</th>
              <th>Phone</th>
              <th>Status</th>
              {currentUser?.role === 'Admin' && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Loading Users...</td></tr>
            ) : (
              users.map(u => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600 }}>{u.first_name} {u.last_name}</td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`role-tag ${roleClassMap[u.role] || ''}`}>{u.role}</span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{u.phone || 'N/A'}</td>
                  <td>
                    {u.is_active ? (
                      <span style={{ color: 'var(--success)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                        <CheckCircle size={14} /> Active
                      </span>
                    ) : (
                      <span style={{ color: 'var(--danger)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                        <XCircle size={14} /> Deactivated
                      </span>
                    )}
                  </td>
                  {currentUser?.role === 'Admin' && (
                    <td>
                      {u.id !== currentUser.id && (
                        <button 
                          onClick={() => handleToggleStatus(u.id, u.is_active)}
                          className="btn btn-secondary"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                        >
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content card-neon">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Add Team Member</h2>
            <form onSubmit={handleCreateUserSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">First Name *</label>
                  <input type="text" className="form-input" required value={newUser.first_name} onChange={e => setNewUser({ ...newUser, first_name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name *</label>
                  <input type="text" className="form-input" required value={newUser.last_name} onChange={e => setNewUser({ ...newUser, last_name: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <input type="email" className="form-input" required value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Password *</label>
                  <input type="password" className="form-input" required value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select className="form-select" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
                    <option value="Sales Executive">Sales Executive</option>
                    <option value="Sales Manager">Sales Manager</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Create Account</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
