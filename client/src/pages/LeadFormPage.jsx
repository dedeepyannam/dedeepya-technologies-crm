import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import API from '../services/api';
import { ArrowLeft, Save, Building, User, Mail, Phone, Briefcase } from 'lucide-react';

const LeadFormPage = () => {
  const { id } = useParams();
  const isEditMode = !!id;
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    source: 'Website Inquiry',
    status: 'NEW',
    assigned_to: ''
  });
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Fetch users for the assigned_to dropdown
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
    
    // Fetch lead details if editing
    const fetchLead = async () => {
      try {
        const res = await API.get(`/leads/${id}`);
        if (res.data.success) {
          const lead = res.data.lead;
          setFormData({
            name: lead.name || '',
            company: lead.company || '',
            email: lead.email || '',
            phone: lead.phone || '',
            source: lead.source || 'Website Inquiry',
            status: lead.status || 'NEW',
            assigned_to: lead.assigned_to || ''
          });
        }
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load lead details.');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
    if (isEditMode) {
      fetchLead();
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
        await API.put(`/leads/${id}`, formData);
      } else {
        await API.post('/leads', formData);
      }
      navigate('/leads');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save lead.');
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
          <Link to="/leads" className="btn btn-secondary" style={{ padding: '0.5rem' }}>
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="page-title">{isEditMode ? 'Edit Lead' : 'Create New Lead'}</h1>
            <p className="page-subtitle">Fill out the information below to {isEditMode ? 'update' : 'create'} the lead.</p>
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
            <label className="form-label">Contact Name *</label>
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
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Company Name</label>
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
                placeholder="jane@example.com"
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
                placeholder="+1 (555) 000-0000"
              />
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border-color)', margin: '2rem 0', paddingTop: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.5rem' }}>Pipeline Information</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label">Lead Status</label>
              <select name="status" className="form-select" value={formData.status} onChange={handleChange}>
                <option value="NEW">NEW</option>
                <option value="CONTACTED">CONTACTED</option>
                <option value="QUALIFIED">QUALIFIED</option>
                <option value="PROPOSAL_SENT">PROPOSAL SENT</option>
                <option value="NEGOTIATION">NEGOTIATION</option>
                <option value="WON">WON</option>
                <option value="LOST">LOST</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Lead Source</label>
              <select name="source" className="form-select" value={formData.source} onChange={handleChange}>
                <option value="Website Inquiry">Website Inquiry</option>
                <option value="Referral">Referral</option>
                <option value="Direct Call">Direct Call</option>
                <option value="LinkedIn Outbound">LinkedIn Outbound</option>
                <option value="Trade Show">Trade Show</option>
                <option value="Partner">Partner</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Assigned Executive</label>
              <div style={{ position: 'relative' }}>
                <Briefcase size={16} style={{ position: 'absolute', top: '10px', left: '12px', color: 'var(--text-muted)' }} />
                <select 
                  name="assigned_to" 
                  className="form-select" 
                  style={{ paddingLeft: '2.5rem' }}
                  value={formData.assigned_to} 
                  onChange={handleChange}
                >
                  <option value="">-- Unassigned --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.role})</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
          <Link to="/leads" className="btn btn-secondary">Cancel</Link>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            <Save size={18} />
            <span>{saving ? 'Saving...' : 'Save Lead'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default LeadFormPage;
