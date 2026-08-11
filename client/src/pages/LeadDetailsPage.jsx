import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import API from '../services/api';
import { ArrowLeft, Building, Mail, Phone, Clock, Edit2, Trash2, ArrowRight, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const LeadDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchLead = async () => {
    try {
      const res = await API.get(`/leads/${id}`);
      if (res.data.success) {
        setLead(res.data.lead);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load lead details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLead();
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to permanently delete this lead?')) return;
    try {
      await API.delete(`/leads/${id}`);
      navigate('/leads');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete lead.');
    }
  };

  const handleConvert = async () => {
    if (!window.confirm('Convert this qualified lead into a Customer Account and Pipeline Deal?')) return;
    try {
      const res = await API.post(`/leads/${id}/convert`);
      if (res.data.success) {
        alert('🎉 Lead successfully converted into Customer Account & Sales Pipeline Deal!');
        fetchLead();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to convert lead.');
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading lead details...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: '2rem' }}>
        <Link to="/leads" className="btn btn-secondary" style={{ marginBottom: '1rem', display: 'inline-flex' }}>
          <ArrowLeft size={16} /> Back to Leads
        </Link>
        <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger)', color: '#f87171', padding: '1rem', borderRadius: '0.5rem' }}>
          {error}
        </div>
      </div>
    );
  }

  if (!lead) return null;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to="/leads" className="btn btn-secondary" style={{ padding: '0.5rem' }}>
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
              {lead.name}
              <span className={`badge badge-${lead.status.toLowerCase().replace('_', '-')}`} style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}>
                {lead.status.replace('_', ' ')}
              </span>
            </h1>
            <p className="page-subtitle" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Building size={14} /> {lead.company || 'Individual'} 
              <span style={{ color: 'var(--text-muted)' }}>• Added from {lead.source}</span>
            </p>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {lead.status === 'QUALIFIED' && (
            <button onClick={handleConvert} className="btn btn-primary" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc' }}>
              <span>Convert to Customer</span>
              <ArrowRight size={16} />
            </button>
          )}
          <Link to={`/leads/${lead.lead_id}/edit`} className="btn btn-secondary">
            <Edit2 size={16} />
            <span>Edit</span>
          </Link>
          {(user?.role === 'Admin' || user?.id === lead.assigned_to) && (
            <button onClick={handleDelete} className="btn btn-secondary" style={{ color: '#f87171', borderColor: 'rgba(248, 113, 113, 0.3)' }}>
              <Trash2 size={16} />
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        {/* Left Column: Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ background: 'var(--glass-bg)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--glass-border)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Contact Information</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Full Name</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}>
                  <User size={16} style={{ color: 'var(--text-secondary)' }} /> {lead.name}
                </div>
              </div>
              
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Company</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}>
                  <Building size={16} style={{ color: 'var(--text-secondary)' }} /> {lead.company || 'N/A'}
                </div>
              </div>
              
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Email Address</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}>
                  <Mail size={16} style={{ color: 'var(--text-secondary)' }} /> 
                  <a href={`mailto:${lead.email}`} style={{ color: '#818cf8', textDecoration: 'none' }}>{lead.email}</a>
                </div>
              </div>
              
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Phone Number</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}>
                  <Phone size={16} style={{ color: 'var(--text-secondary)' }} /> {lead.phone || 'N/A'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Meta Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ background: 'var(--glass-bg)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--glass-border)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Lead Status</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Assigned To</div>
                <div style={{ fontWeight: 500 }}>
                  {lead.assigned_first_name ? `${lead.assigned_first_name} ${lead.assigned_last_name}` : 'Unassigned'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Lead Source</div>
                <div style={{ fontWeight: 500 }}>{lead.source}</div>
              </div>

              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Created On</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}>
                  <Clock size={16} style={{ color: 'var(--text-secondary)' }} /> 
                  {new Date(lead.created_at).toLocaleString()}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Last Updated</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}>
                  <Clock size={16} style={{ color: 'var(--text-secondary)' }} /> 
                  {new Date(lead.updated_at).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadDetailsPage;
