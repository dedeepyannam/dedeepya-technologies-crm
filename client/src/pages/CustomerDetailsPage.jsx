import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import API from '../services/api';
import { ArrowLeft, Building, Mail, Phone, Clock, Edit2, Trash2, User, MapPin, FileText, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const CustomerDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchCustomer = async () => {
    try {
      const res = await API.get(`/customers/${id}`);
      if (res.data.success) {
        setCustomer(res.data.customer);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load customer details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomer();
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to permanently delete this customer account?')) return;
    try {
      await API.delete(`/customers/${id}`);
      navigate('/customers');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete customer account.');
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading account details...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: '2rem' }}>
        <Link to="/customers" className="btn btn-secondary" style={{ marginBottom: '1rem', display: 'inline-flex' }}>
          <ArrowLeft size={16} /> Back to Customers
        </Link>
        <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger)', color: '#f87171', padding: '1rem', borderRadius: '0.5rem' }}>
          {error}
        </div>
      </div>
    );
  }

  if (!customer) return null;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to="/customers" className="btn btn-secondary" style={{ padding: '0.5rem' }}>
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
              {customer.company}
              <span className="badge badge-success" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}>
                ACTIVE ACCOUNT
              </span>
            </h1>
            <p className="page-subtitle" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Building size={14} /> Client 
              {customer.lead_id && <span style={{ color: 'var(--text-muted)' }}>• Converted from Lead #{customer.lead_id}</span>}
            </p>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link to={`/customers/${customer.customer_id}/edit`} className="btn btn-secondary">
            <Edit2 size={16} />
            <span>Edit</span>
          </Link>
          {(user?.role === 'Admin' || user?.id === customer.owner_id) && (
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
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Account Information</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Company Name</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}>
                  <Building size={16} style={{ color: 'var(--text-secondary)' }} /> {customer.company}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Primary Contact Name</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}>
                  <User size={16} style={{ color: 'var(--text-secondary)' }} /> {customer.name || 'N/A'}
                </div>
              </div>
              
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Email Address</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}>
                  <Mail size={16} style={{ color: 'var(--text-secondary)' }} /> 
                  {customer.email ? (
                    <a href={`mailto:${customer.email}`} style={{ color: '#818cf8', textDecoration: 'none' }}>{customer.email}</a>
                  ) : 'N/A'}
                </div>
              </div>
              
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Phone Number</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}>
                  <Phone size={16} style={{ color: 'var(--text-secondary)' }} /> {customer.phone || 'N/A'}
                </div>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Address</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}>
                <MapPin size={16} style={{ color: 'var(--text-secondary)' }} /> {customer.address || 'N/A'}
              </div>
            </div>
          </div>
          
          <div style={{ background: 'var(--glass-bg)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--glass-border)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Account Notes</h3>
            <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
              {customer.notes || 'No notes available for this account.'}
            </div>
          </div>
        </div>

        {/* Right Column: Meta */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ background: 'var(--glass-bg)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--glass-border)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Account Details</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Account Owner</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600 }}>
                    {customer.owner_first_name?.charAt(0)}{customer.owner_last_name?.charAt(0)}
                  </div>
                  <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{customer.owner_first_name} {customer.owner_last_name}</span>
                </div>
              </div>
              
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Customer ID</div>
                <div style={{ fontSize: '0.9rem', fontFamily: 'monospace' }}>#{customer.customer_id}</div>
              </div>
              
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Origination</div>
                {customer.lead_id ? (
                  <Link to={`/leads/${customer.lead_id}`} style={{ fontSize: '0.9rem', color: '#818cf8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    View Original Lead <ExternalLink size={14} />
                  </Link>
                ) : (
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Direct Entry</span>
                )}
              </div>
              
              <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Created At</div>
                <div style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Clock size={14} style={{ color: 'var(--text-muted)' }} />
                  {new Date(customer.created_at).toLocaleString()}
                </div>
              </div>
              
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Last Updated</div>
                <div style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Clock size={14} style={{ color: 'var(--text-muted)' }} />
                  {new Date(customer.updated_at).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDetailsPage;
