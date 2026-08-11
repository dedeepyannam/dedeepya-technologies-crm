import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import API from '../services/api';
import { ArrowLeft, Save, Building, User, Mail, Phone, MapPin, FileText } from 'lucide-react';

const CustomerFormPage = () => {
  const { id } = useParams();
  const isEditMode = !!id;
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
    owner_id: ''
  });
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Fetch users for the owner_id dropdown
    const fetchUsers = async () => {
      try {
        const res = await API.get('/users'); // Assuming /api/users exists
        if (res.data.success) {
          setUsers(res.data.users);
        }
      } catch (err) {
        console.error('Error fetching users:', err);
      }
    };
    
    // Fetch customer details if editing
    const fetchCustomer = async () => {
      try {
        const res = await API.get(`/customers/${id}`);
        if (res.data.success) {
          const customer = res.data.customer;
          setFormData({
            name: customer.name || '',
            company: customer.company || '',
            email: customer.email || '',
            phone: customer.phone || '',
            address: customer.address || '',
            notes: customer.notes || '',
            owner_id: customer.owner_id || ''
          });
        }
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load customer details.');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
    if (isEditMode) {
      fetchCustomer();
    }
  }, [id, isEditMode]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      if (isEditMode) {
        await API.put(`/customers/${id}`, formData);
      } else {
        await API.post('/customers', formData);
      }
      navigate('/customers');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save customer account.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading form...</div>;
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to="/customers" className="btn btn-secondary" style={{ padding: '0.5rem' }}>
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="page-title">{isEditMode ? 'Edit Customer Account' : 'Create New Customer'}</h1>
            <p className="page-subtitle">Fill out the information below to {isEditMode ? 'update' : 'create'} the account.</p>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger)', color: '#f87171', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ background: 'var(--glass-bg)', padding: '2rem', borderRadius: '1rem', border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-md)' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div className="form-group">
            <label className="form-label">Company Name *</label>
            <div style={{ position: 'relative' }}>
              <Building size={16} style={{ position: 'absolute', top: '10px', left: '12px', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                name="company"
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                value={formData.company}
                onChange={handleChange}
                placeholder="Acme Corp"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Primary Contact Name</label>
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position: 'absolute', top: '10px', left: '12px', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                name="name"
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                value={formData.name}
                onChange={handleChange}
                placeholder="Jane Doe"
              />
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div className="form-group">
            <label className="form-label">Email Address *</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', top: '10px', left: '12px', color: 'var(--text-muted)' }} />
              <input 
                type="email" 
                name="email"
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                value={formData.email}
                onChange={handleChange}
                placeholder="contact@company.com"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <div style={{ position: 'relative' }}>
              <Phone size={16} style={{ position: 'absolute', top: '10px', left: '12px', color: 'var(--text-muted)' }} />
              <input 
                type="tel" 
                name="phone"
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                value={formData.phone}
                onChange={handleChange}
                placeholder="+1 555-0000"
              />
            </div>
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
          <label className="form-label">Address</label>
          <div style={{ position: 'relative' }}>
            <MapPin size={16} style={{ position: 'absolute', top: '10px', left: '12px', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              name="address"
              className="form-input"
              style={{ paddingLeft: '2.5rem' }}
              value={formData.address}
              onChange={handleChange}
              placeholder="123 Main St, City, Country"
            />
          </div>
        </div>
        
        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
          <label className="form-label">Account Notes</label>
          <div style={{ position: 'relative' }}>
            <FileText size={16} style={{ position: 'absolute', top: '10px', left: '12px', color: 'var(--text-muted)' }} />
            <textarea
              name="notes"
              className="form-input"
              style={{ paddingLeft: '2.5rem', minHeight: '100px', paddingTop: '0.6rem' }}
              value={formData.notes}
              onChange={handleChange}
              placeholder="Any relevant background information..."
            ></textarea>
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: '2rem' }}>
          <label className="form-label">Account Owner</label>
          <select 
            name="owner_id" 
            className="form-select" 
            value={formData.owner_id} 
            onChange={handleChange}
          >
            <option value="">-- Assign to Team Member --</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.role})</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
          <Link to="/customers" className="btn btn-secondary">Cancel</Link>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : (
              <>
                <Save size={18} />
                <span>{isEditMode ? 'Update Customer' : 'Create Customer'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CustomerFormPage;
