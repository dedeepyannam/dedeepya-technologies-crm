import React, { useEffect, useState } from 'react';
import API from '../services/api';
import { Plus, Building, User, Calendar, DollarSign } from 'lucide-react';

const STAGES = ['New Lead', 'Contacted', 'Qualified', 'Proposal Sent', 'Negotiation', 'Won', 'Lost'];

const PipelinePage = () => {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [draggedDeal, setDraggedDeal] = useState(null);
  const [error, setError] = useState(null);
  
  const [newDeal, setNewDeal] = useState({
    title: '', customer_id: '', amount: '', stage: 'New Lead', expected_close_date: ''
  });

  const fetchPipelineData = async () => {
    try {
      const [dealsRes, custRes] = await Promise.all([
        API.get('/deals'),
        API.get('/customers')
      ]);

      if (dealsRes.data.success) setDeals(dealsRes.data.deals);
      if (custRes.data.success) setCustomers(custRes.data.customers);
    } catch (err) {
      console.error('Error fetching pipeline deals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPipelineData();
  }, []);

  const handleDragStart = (e, deal) => {
    setDraggedDeal(deal);
    e.dataTransfer.effectAllowed = 'move';
    // Firefox requires dataTransfer data to be set
    e.dataTransfer.setData('text/plain', deal.id.toString());
  };

  const handleDragOver = (e) => {
    e.preventDefault(); // Necessary to allow dropping
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, targetStage) => {
    e.preventDefault();
    if (!draggedDeal) return;
    
    // If it's the same stage, do nothing
    if (draggedDeal.stage === targetStage) {
      setDraggedDeal(null);
      return;
    }

    // Optimistically update UI
    const originalDeals = [...deals];
    setDeals(deals.map(d => d.id === draggedDeal.id ? { ...d, stage: targetStage } : d));
    setError(null);

    try {
      await API.patch(`/deals/${draggedDeal.id}/stage`, { stage: targetStage });
      // Re-fetch to get updated probability and updated_at
      fetchPipelineData();
    } catch (err) {
      // Revert on error
      setDeals(originalDeals);
      const errMsg = err.response?.data?.error || 'Failed to move deal stage.';
      setError(errMsg);
      // Auto-hide error after 5s
      setTimeout(() => setError(null), 5000);
    }
    
    setDraggedDeal(null);
  };

  const handleCreateDealSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post('/deals', newDeal);
      if (res.data.success) {
        setShowCreateModal(false);
        setNewDeal({ title: '', customer_id: '', amount: '', stage: 'New Lead', expected_close_date: '' });
        fetchPipelineData();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create deal.');
    }
  };

  const formatCurrency = (val) => `$${Number(val || 0).toLocaleString('en-US')}`;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Sales Pipeline</h1>
          <p className="page-subtitle">Visual 7-stage pipeline kanban board with deal probability tracking.</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
          <Plus size={18} />
          <span>New Opportunity</span>
        </button>
      </div>
      
      {error && (
        <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger)', color: '#f87171', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
        </div>
      )}

      {loading ? (
        <div className="loading-spinner" style={{ margin: '2rem auto' }}></div>
      ) : (
        <div className="pipeline-container">
          {STAGES.map(stage => {
            const stageDeals = deals.filter(d => d.stage === stage);
            const totalStageValue = stageDeals.reduce((sum, d) => sum + Number(d.amount || 0), 0);

            return (
              <div 
                key={stage} 
                className="pipeline-column"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage)}
                style={{
                  minHeight: '400px' // ensure drop target even if empty
                }}
              >
                <div className="column-header">
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{stage}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatCurrency(totalStageValue)}</div>
                  </div>
                  <div className="column-count">{stageDeals.length} Deals</div>
                </div>

                <div className="column-body">
                  {stageDeals.length === 0 ? (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 1rem', border: '2px dashed var(--border-color)', borderRadius: '0.5rem', margin: '0.5rem 0' }}>
                      Drop deals here
                    </div>
                  ) : (
                    stageDeals.map(deal => (
                      <div 
                        key={deal.id} 
                        className="deal-card card-neon"
                        draggable
                        onDragStart={(e) => handleDragStart(e, deal)}
                        style={{ cursor: 'grab', opacity: draggedDeal?.id === deal.id ? 0.5 : 1 }}
                      >
                        <div className="deal-card-title">{deal.title}</div>
                        
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Building size={12} /> {deal.customer_name}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <User size={12} /> {deal.contact_name}
                        </div>
                        
                        <div className="deal-card-amount">{formatCurrency(deal.amount)}</div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
                          <div>
                             <span style={{ display: 'block', marginBottom: '0.1rem' }}>Owner</span>
                             <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{deal.assigned_first_name || 'Unassigned'}</span>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                             <span style={{ display: 'block', marginBottom: '0.1rem' }}>Stage</span>
                             <span className="badge badge-info" style={{ fontSize: '0.65rem', padding: '0.1rem 0.3rem', background: 'rgba(255,255,255,0.05)' }}>{deal.stage}</span>
                          </div>
                        </div>

                        {deal.expected_close_date && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: '#fbbf24', marginTop: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
                            <Calendar size={12} /> {new Date(deal.expected_close_date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Opportunity Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content card-neon">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Add Pipeline Deal</h2>
            
            <form onSubmit={handleCreateDealSubmit}>
              <div className="form-group">
                <label className="form-label">Deal Title *</label>
                <input 
                  type="text" className="form-control" required 
                  value={newDeal.title} onChange={e => setNewDeal({ ...newDeal, title: e.target.value })}
                  placeholder="e.g. Acme Software Renewal"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Customer Account *</label>
                <select 
                  className="form-select" required
                  value={newDeal.customer_id} onChange={e => setNewDeal({ ...newDeal, customer_id: e.target.value })}
                >
                  <option value="">Select Customer Account</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Deal Value ($) *</label>
                  <input 
                    type="number" className="form-control" required 
                    value={newDeal.amount} onChange={e => setNewDeal({ ...newDeal, amount: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Pipeline Stage</label>
                  <select 
                    className="form-select"
                    value={newDeal.stage} onChange={e => setNewDeal({ ...newDeal, stage: e.target.value })}
                  >
                    {STAGES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Expected Close Date</label>
                  <input 
                    type="date" className="form-control"
                    value={newDeal.expected_close_date} onChange={e => setNewDeal({ ...newDeal, expected_close_date: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Create Deal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PipelinePage;
