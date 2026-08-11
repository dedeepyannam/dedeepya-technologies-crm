import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../services/api';
import { Plus, Search, Building2, Globe, Mail, Phone, MapPin, Users, DollarSign, Edit2, Trash2, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const CustomersPage = () => {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      let url = `/customers?page=${page}&limit=10&`;
      if (search) url += `search=${encodeURIComponent(search)}&`;

      const res = await API.get(url);
      if (res.data.success) {
        setCustomers(res.data.customers);
        setTotalPages(res.data.totalPages);
        setTotalCustomers(res.data.total);
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [search, page]);

  const handleDelete = async (customerId) => {
    if (!window.confirm('Are you sure you want to delete this customer account?')) return;
    try {
      await API.delete(`/customers/${customerId}`);
      fetchCustomers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete customer.');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Customer Accounts</h1>
          <p className="page-subtitle">Manage company accounts, contact information, and account details.</p>
        </div>
        <Link to="/customers/new" className="btn btn-primary">
          <Plus size={18} />
          <span>Add Account</span>
        </Link>
      </div>

      {/* Filter Controls Bar */}
      <div className="card-neon p-md m-b-md">
        <div className="filter-bar">
          <div className="search-container">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              className="form-input" 
              placeholder="Search accounts..." 
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Company Details</th>
              <th>Primary Contact</th>
              <th>Location</th>
              <th>Account Owner</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" className="text-center p-md">
                  <div className="loading-spinner"></div>
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center p-md">
                  <div className="empty-state">
                    <Building2 size={48} className="empty-icon" />
                    <h3 className="empty-title">No Accounts Found</h3>
                    <p className="empty-subtitle">Try adjusting your search query.</p>
                  </div>
                </td>
              </tr>
            ) : (
              customers.map(c => (
                <tr key={c.customer_id}>
                  <td>
                    <div className="text-bold" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                      <Building2 size={16} style={{ color: 'var(--text-muted)' }} />
                      <Link to={`/customers/${c.customer_id}`} className="table-link">{c.company}</Link>
                    </div>
                  </td>
                  <td>
                    {c.name ? (
                      <div>
                        <div style={{ fontWeight: 500 }}>{c.name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.2rem', marginTop: '0.2rem' }}>
                          <Mail size={12} /> {c.email || 'N/A'}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.2rem', marginTop: '0.2rem' }}>
                          <Phone size={12} /> {c.phone || 'N/A'}
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>No primary contact</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      {c.address ? <><MapPin size={15} /> {c.address}</> : <span style={{ color: 'var(--text-muted)' }}>No address</span>}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>
                        {c.owner_first_name?.charAt(0)}{c.owner_last_name?.charAt(0)}
                      </div>
                      <span style={{ fontSize: '0.9rem' }}>{c.owner_first_name} {c.owner_last_name}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <Link to={`/customers/${c.customer_id}`} className="btn btn-secondary" style={{ padding: '0.4rem', border: 'none' }} title="View Details">
                        <Eye size={18} />
                      </Link>
                      <Link to={`/customers/${c.customer_id}/edit`} className="btn btn-secondary" style={{ padding: '0.4rem', border: 'none' }} title="Edit Account">
                        <Edit2 size={18} />
                      </Link>
                      {(user.role === 'Admin' || user.first_name === c.owner_first_name) && (
                        <button onClick={() => handleDelete(c.customer_id)} className="btn btn-secondary" style={{ padding: '0.4rem', border: 'none' }} title="Delete Account">
                          <Trash2 size={18} style={{ color: '#f87171' }} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        
        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Showing {((page - 1) * 10) + 1} to {Math.min(page * 10, totalCustomers)} of {totalCustomers} accounts
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                className="btn btn-secondary" 
                style={{ padding: '0.4rem 0.8rem' }}
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft size={16} /> Prev
              </button>
              <button 
                className="btn btn-secondary" 
                style={{ padding: '0.4rem 0.8rem' }}
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomersPage;
