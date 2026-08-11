import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../services/api';
import { Plus, Search, Filter, ArrowRight, UserCheck, Phone, Mail, Building, Trash2, Edit2, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const LeadsPage = () => {
  const [leads, setLeads] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLeads, setTotalLeads] = useState(0);
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchLeads = async () => {
    setLoading(true);
    try {
      let url = `/leads?page=${page}&limit=10&`;
      if (search) url += `search=${encodeURIComponent(search)}&`;
      if (statusFilter) url += `status=${encodeURIComponent(statusFilter)}&`;

      const res = await API.get(url);
      if (res.data.success) {
        setLeads(res.data.leads);
        setTotalPages(res.data.totalPages);
        setTotalLeads(res.data.total);
      }
    } catch (err) {
      console.error('Error loading leads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [search, statusFilter, page]);

  const handleStatusChange = async (leadId, newStatus) => {
    try {
      await API.put(`/leads/${leadId}`, { status: newStatus });
      fetchLeads();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update status.');
    }
  };

  const handleConvertLead = async (leadId) => {
    if (!window.confirm('Convert this qualified lead into a Customer Account and Pipeline Deal?')) return;
    try {
      const res = await API.post(`/leads/${leadId}/convert`);
      if (res.data.success) {
        alert('🎉 Lead successfully converted into Customer Account & Sales Pipeline Deal!');
        fetchLeads();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to convert lead.');
    }
  };

  const handleDelete = async (leadId) => {
    if (!window.confirm('Are you sure you want to delete this lead?')) return;
    try {
      await API.delete(`/leads/${leadId}`);
      fetchLeads();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete lead.');
    }
  };

  const badgeClassMap = {
    'NEW': 'badge-info',
    'CONTACTED': 'badge-purple',
    'QUALIFIED': 'badge-success',
    'PROPOSAL_SENT': 'badge-warning',
    'NEGOTIATION': 'badge-danger',
    'WON': 'badge-success',
    'LOST': 'badge-danger'
  };

  const formatStatus = (status) => status.replace('_', ' ');

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Lead Management</h1>
          <p className="page-subtitle">Track, qualify, and convert incoming leads into active deals.</p>
        </div>
        <Link to="/leads/new" className="btn btn-primary">
          <Plus size={18} />
          <span>Add New Lead</span>
        </Link>
      </div>

      <div className="card-neon p-md m-b-md">
        <div className="filter-bar">
          <div className="search-container">
            <Search className="search-icon" size={18} />
            <input 
              type="text" 
              placeholder="Search leads by name, email, or company..." 
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="form-input"
            />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '200px' }}>
            <Filter size={18} color="var(--text-muted)" />
            <select 
              value={statusFilter} 
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="form-select"
            >
              <option value="">All Statuses</option>
              <option value="NEW">New</option>
              <option value="CONTACTED">Contacted</option>
              <option value="QUALIFIED">Qualified</option>
              <option value="PROPOSAL_SENT">Proposal Sent</option>
              <option value="NEGOTIATION">Negotiation</option>
              <option value="WON">Won</option>
              <option value="LOST">Lost</option>
            </select>
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Lead Details</th>
              <th>Contact Person</th>
              <th>Status Stage</th>
              <th>Assigned To</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" className="text-center p-md">
                  <div className="loading-spinner"></div>
                </td>
              </tr>
            ) : leads.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center p-md">
                  <div className="empty-state">
                    <UserCheck size={48} className="empty-icon" />
                    <h3 className="empty-title">No Leads Found</h3>
                    <p className="empty-subtitle">Try adjusting your search or filters.</p>
                  </div>
                </td>
              </tr>
            ) : (
              leads.map(lead => (
                <tr key={lead.lead_id}>
                  <td>
                    <div className="text-bold">
                      <Link to={`/leads/${lead.lead_id}`} className="table-link">
                        {lead.company || lead.name} Lead
                      </Link>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.2rem' }}>
                      <Building size={14} /> {lead.company || 'Individual'} • <span style={{ color: 'var(--text-muted)' }}>{lead.source}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{lead.name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{lead.email}</div>
                  </td>
                  <td>
                    <select 
                      className="form-select"
                      value={lead.status}
                      onChange={(e) => handleStatusChange(lead.lead_id, e.target.value)}
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', minWidth: '120px' }}
                    >
                      <option value="NEW">NEW</option>
                      <option value="CONTACTED">CONTACTED</option>
                      <option value="QUALIFIED">QUALIFIED</option>
                      <option value="PROPOSAL_SENT">PROPOSAL SENT</option>
                      <option value="NEGOTIATION">NEGOTIATION</option>
                      <option value="WON">WON</option>
                      <option value="LOST">LOST</option>
                    </select>
                  </td>
                  <td>
                    {lead.assigned_first_name ? `${lead.assigned_first_name} ${lead.assigned_last_name}` : 'Unassigned'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      {lead.status === 'QUALIFIED' && (
                        <button 
                          onClick={() => handleConvertLead(lead.lead_id)}
                          className="btn btn-secondary" 
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', color: '#a5b4fc', border: '1px solid rgba(99, 102, 241, 0.4)' }}
                          title="Convert to Customer & Pipeline Deal"
                        >
                          <ArrowRight size={14} />
                        </button>
                      )}
                      
                      <Link to={`/leads/${lead.lead_id}`} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} title="View">
                        <Eye size={14} />
                      </Link>

                      <Link to={`/leads/${lead.lead_id}/edit`} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} title="Edit">
                        <Edit2 size={14} />
                      </Link>

                      {(user?.role === 'Admin' || user?.id === lead.assigned_to) && (
                        <button onClick={() => handleDelete(lead.lead_id)} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', color: '#f87171' }} title="Delete">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', padding: '0 1rem' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Showing page {page} of {totalPages} ({totalLeads} total leads)
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))} 
              disabled={page === 1}
              className="btn btn-secondary"
            >
              <ChevronLeft size={16} /> Previous
            </button>
            <button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
              disabled={page === totalPages}
              className="btn btn-secondary"
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadsPage;
