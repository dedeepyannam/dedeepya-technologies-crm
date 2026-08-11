import React, { useEffect, useState } from 'react';
import API from '../services/api';
import { Plus, History, Phone, Video, Mail, FileText, CheckCircle, Calendar } from 'lucide-react';

const ActivitiesPage = () => {
  const [followups, setFollowups] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [deals, setDeals] = useState([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [newLog, setNewLog] = useState({
    title: '', type: 'Call', notes: '', follow_up_date: new Date().toISOString().split('T')[0],
    next_followup_date: '', customer_id: '', deal_id: ''
  });

  const fetchData = async () => {
    try {
      let url = '/followups?';
      if (typeFilter) url += `type=${encodeURIComponent(typeFilter)}`;
      
      const [folRes, custRes, dealsRes] = await Promise.all([
        API.get(url),
        API.get('/customers'),
        API.get('/deals')
      ]);

      if (folRes.data.success) setFollowups(folRes.data.followups);
      if (custRes.data.success) setCustomers(custRes.data.customers);
      if (dealsRes.data.success) setDeals(dealsRes.data.deals);
    } catch (err) {
      console.error('Error fetching activities:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [typeFilter]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...newLog };
      if (!payload.next_followup_date) delete payload.next_followup_date;
      if (!payload.customer_id) delete payload.customer_id;
      if (!payload.deal_id) delete payload.deal_id;

      const res = await API.post('/followups', payload);
      if (res.data.success) {
        setShowModal(false);
        setNewLog({ 
          title: '', type: 'Call', notes: '', follow_up_date: new Date().toISOString().split('T')[0],
          next_followup_date: '', customer_id: '', deal_id: '' 
        });
        fetchData();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to log activity.');
    }
  };

  const typeIconMap = {
    'Call': <Phone size={16} className="text-cyan-400" />,
    'Meeting': <Video size={16} className="text-indigo-400" />,
    'Email': <Mail size={16} className="text-amber-400" />,
    'Note': <FileText size={16} className="text-emerald-400" />,
    'Demo': <CheckCircle size={16} className="text-purple-400" />
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Follow-ups & Activity Logs</h1>
          <p className="page-subtitle">Track calls, meetings, demo interactions, and notes attached to client accounts.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          <Plus size={18} />
          <span>Log Activity</span>
        </button>
      </div>

      <div className="filter-bar">
        <select className="form-select" style={{ maxWidth: '300px' }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="">All Activity Types</option>
          <option value="Call">Call</option>
          <option value="Meeting">Meeting</option>
          <option value="Email">Email</option>
          <option value="Note">Note</option>
          <option value="Demo">Demo</option>
        </select>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {loading ? (
          <div className="loading-spinner" style={{ margin: '2rem auto' }}></div>
        ) : followups.length === 0 ? (
          <div className="empty-state">
            <History size={48} className="empty-icon" />
            <h3 className="empty-title">No Activities Found</h3>
            <p className="empty-subtitle">You have no logged activities matching this filter.</p>
          </div>
        ) : (
          followups.map(f => (
            <div key={f.id} className="card-neon" style={{
              padding: '1.25rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '1rem',
              borderLeft: '4px solid var(--primary)'
            }}>
              <div style={{
                padding: '0.6rem',
                borderRadius: '0.5rem',
                background: 'var(--bg-dark)'
              }}>
                {typeIconMap[f.type] || <FileText size={16} />}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <div>
                    <h4 style={{ fontWeight: 600, fontSize: '1rem' }}>{f.title}</h4>
                    <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '0.2rem' }}>
                      {f.customer_name ? `🏢 ${f.customer_name}` : ''} {f.deal_title ? ` | 💼 ${f.deal_title}` : ''}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                      Logged: {new Date(f.follow_up_date).toLocaleDateString()}
                    </span>
                    {f.next_followup_date && (
                      <span style={{ fontSize: '0.75rem', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.3rem' }}>
                        <Calendar size={12} /> Next: {new Date(f.next_followup_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                  {f.notes || 'No detailed notes provided.'}
                </p>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Logged by: <strong>{f.user_first_name ? `${f.user_first_name} ${f.user_last_name}` : 'System'}</strong>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content card-neon" style={{ maxWidth: '600px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Log Client Activity</h2>
            <form onSubmit={handleCreateSubmit}>
              <div className="form-group">
                <label className="form-label">Activity Title *</label>
                <input type="text" className="form-input" required value={newLog.title} onChange={e => setNewLog({ ...newLog, title: e.target.value })} placeholder="e.g. Discovery Call with CTO" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Related Customer</label>
                  <select className="form-select" value={newLog.customer_id} onChange={e => setNewLog({ ...newLog, customer_id: e.target.value })}>
                    <option value="">None</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Related Deal</label>
                  <select className="form-select" value={newLog.deal_id} onChange={e => setNewLog({ ...newLog, deal_id: e.target.value })}>
                    <option value="">None</option>
                    {deals.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Activity Type</label>
                  <select className="form-select" value={newLog.type} onChange={e => setNewLog({ ...newLog, type: e.target.value })}>
                    <option value="Call">Call</option>
                    <option value="Meeting">Meeting</option>
                    <option value="Email">Email</option>
                    <option value="Note">Note</option>
                    <option value="Demo">Demo</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input type="date" className="form-input" required value={newLog.follow_up_date} onChange={e => setNewLog({ ...newLog, follow_up_date: e.target.value })} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Notes & Summary</label>
                <textarea className="form-textarea" rows="3" value={newLog.notes} onChange={e => setNewLog({ ...newLog, notes: e.target.value })} />
              </div>

              <div className="form-group">
                <label className="form-label">Next Follow-up Date (Optional)</label>
                <input type="date" className="form-input" value={newLog.next_followup_date} onChange={e => setNewLog({ ...newLog, next_followup_date: e.target.value })} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Save Activity</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivitiesPage;
