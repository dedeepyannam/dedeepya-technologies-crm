import React, { useEffect, useState } from 'react';
import API from '../services/api';
import { Download, FileText, Filter, BarChart2, PieChart as PieChartIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e'];

const ReportsPage = () => {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    employeeId: '',
    leadStatus: '',
    dealStage: ''
  });

  const [reportData, setReportData] = useState({
    summary: {},
    charts: { salesPerformance: [], leadDistribution: [], customerGrowth: [] },
    tables: { deals: [], leads: [] }
  });

  useEffect(() => {
    fetchUsers();
    fetchReports();
  }, []); // Initial load

  const fetchUsers = async () => {
    try {
      const res = await API.get('/users');
      if (res.data.success) setEmployees(res.data.users);
    } catch (err) {
      console.error('Failed to load users', err);
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key]) queryParams.append(key, filters[key]);
      });
      
      const res = await API.get(`/reports?${queryParams.toString()}`);
      if (res.data.success) {
        setReportData(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch reports', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterApply = (e) => {
    e.preventDefault();
    fetchReports();
  };

  const handleFilterReset = () => {
    setFilters({ startDate: '', endDate: '', employeeId: '', leadStatus: '', dealStage: '' });
    // Note: useEffect doesn't trigger on this reset natively, so we fetch directly after state update is simulated by passing empty filters
    API.get(`/reports`).then(res => {
      if (res.data.success) setReportData(res.data);
    });
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    
    // Deals Sheet
    const wsDeals = XLSX.utils.json_to_sheet(reportData.tables.deals.map(d => ({
      ID: d.id,
      Title: d.title,
      Stage: d.stage,
      Amount: d.amount,
      'Close Date': d.expected_close_date,
      'Assigned To': d.assigned_to
    })));
    XLSX.utils.book_append_sheet(wb, wsDeals, 'Filtered Deals');

    // Leads Sheet
    const wsLeads = XLSX.utils.json_to_sheet(reportData.tables.leads.map(l => ({
      ID: l.id,
      Name: l.name,
      Company: l.company,
      Status: l.status,
      Source: l.source,
      'Estimated Value': l.estimated_value,
      'Assigned To': l.assigned_to
    })));
    XLSX.utils.book_append_sheet(wb, wsLeads, 'Filtered Leads');

    XLSX.writeFile(wb, `CRM_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text('CRM Custom Analytical Report', 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 22);

    // Summary block
    doc.text(`Total Revenue: $${Number(reportData.summary.totalRevenue || 0).toLocaleString()}`, 14, 32);
    doc.text(`Conversion Rate: ${reportData.summary.conversionRate}%`, 14, 38);
    doc.text(`Filtered Leads: ${reportData.summary.totalFilteredLeads}`, 14, 44);
    doc.text(`Filtered Deals: ${reportData.summary.totalFilteredDeals}`, 14, 50);

    let currentY = 60;

    // Deals Table
    if (reportData.tables.deals.length > 0) {
      doc.text('Filtered Deals', 14, currentY);
      doc.autoTable({
        startY: currentY + 5,
        head: [['ID', 'Title', 'Stage', 'Amount', 'Assigned To']],
        body: reportData.tables.deals.map(d => [d.id, d.title, d.stage, `$${d.amount}`, d.assigned_to]),
        theme: 'striped',
        styles: { fontSize: 8 }
      });
      currentY = doc.lastAutoTable.finalY + 15;
    }

    // Leads Table
    if (reportData.tables.leads.length > 0) {
      doc.text('Filtered Leads', 14, currentY);
      doc.autoTable({
        startY: currentY + 5,
        head: [['ID', 'Name', 'Company', 'Status', 'Assigned To']],
        body: reportData.tables.leads.map(l => [l.id, l.name, l.company, l.status, l.assigned_to]),
        theme: 'striped',
        styles: { fontSize: 8 }
      });
    }

    doc.save(`CRM_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div>
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Custom Reports</h1>
          <p className="page-subtitle">Build highly customized, sliceable reports with powerful filters and multi-format exports.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={exportToPDF} className="btn btn-secondary">
            <FileText size={18} className="text-red-400" />
            <span>Export PDF</span>
          </button>
          <button onClick={exportToExcel} className="btn btn-secondary">
            <Download size={18} className="text-emerald-400" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Filter size={18} className="text-primary" />
          <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Filter Criteria</h3>
        </div>
        <form onSubmit={handleFilterApply} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Start Date</label>
            <input type="date" className="form-input" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">End Date</label>
            <input type="date" className="form-input" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Employee / Rep</label>
            <select className="form-select" value={filters.employeeId} onChange={e => setFilters({...filters, employeeId: e.target.value})}>
              <option value="">All Employees</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Lead Status</label>
            <select className="form-select" value={filters.leadStatus} onChange={e => setFilters({...filters, leadStatus: e.target.value})}>
              <option value="">All Statuses</option>
              <option value="New Lead">New Lead</option>
              <option value="Qualified">Qualified</option>
              <option value="Won">Won</option>
              <option value="Lost">Lost</option>
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Deal Stage</label>
            <select className="form-select" value={filters.dealStage} onChange={e => setFilters({...filters, dealStage: e.target.value})}>
              <option value="">All Stages</option>
              <option value="Proposal Sent">Proposal Sent</option>
              <option value="Negotiation">Negotiation</option>
              <option value="Won">Won</option>
              <option value="Lost">Lost</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>Apply</button>
            <button type="button" onClick={handleFilterReset} className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>Reset</button>
          </div>
        </form>
      </div>

      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Running analytical queries...</div>
      ) : (
        <>
          {/* Summary KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ background: 'var(--bg-dark)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Filtered Revenue (Won Deals)</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>${Number(reportData.summary.totalRevenue || 0).toLocaleString()}</div>
            </div>
            <div style={{ background: 'var(--bg-dark)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Filtered Conv. Rate</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#3b82f6' }}>{reportData.summary.conversionRate}%</div>
            </div>
            <div style={{ background: 'var(--bg-dark)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Total Matching Leads</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc' }}>{reportData.summary.totalFilteredLeads}</div>
            </div>
            <div style={{ background: 'var(--bg-dark)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Total Matching Deals</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc' }}>{reportData.summary.totalFilteredDeals}</div>
            </div>
          </div>

          {/* Charts based on filters */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            
            <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <BarChart2 className="text-indigo-400" size={18} />
                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Filtered Employee Performance (Deals)</h3>
              </div>
              <div style={{ width: '100%', height: '250px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportData.charts.salesPerformance} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `$${v/1000}k`} />
                    <Tooltip contentStyle={{ background: '#0f172a', borderColor: '#334155' }} />
                    <Bar dataKey="total_value" fill="#6366f1" radius={[4, 4, 0, 0]} name="Total Value" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <PieChartIcon className="text-amber-400" size={18} />
                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Filtered Lead Distribution</h3>
              </div>
              <div style={{ width: '100%', height: '250px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={reportData.charts.leadDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="count">
                      {reportData.charts.leadDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#0f172a', borderColor: '#334155' }} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* Raw Data Tables */}
          <div style={{ background: 'var(--bg-card)', borderRadius: '0.75rem', border: '1px solid var(--border-color)', padding: '1rem', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', paddingLeft: '0.5rem' }}>Filtered Deals ({reportData.tables.deals.length})</h3>
            <div className="table-container" style={{ maxHeight: '300px', overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Stage</th>
                    <th>Amount</th>
                    <th>Assigned To</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.tables.deals.map(d => (
                    <tr key={d.id}>
                      <td style={{ fontWeight: 600 }}>{d.title}</td>
                      <td>{d.stage}</td>
                      <td style={{ color: '#10b981', fontWeight: 600 }}>${Number(d.amount).toLocaleString()}</td>
                      <td>{d.assigned_to || 'Unassigned'}</td>
                    </tr>
                  ))}
                  {reportData.tables.deals.length === 0 && (
                    <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No deals match the filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          <div style={{ background: 'var(--bg-card)', borderRadius: '0.75rem', border: '1px solid var(--border-color)', padding: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', paddingLeft: '0.5rem' }}>Filtered Leads ({reportData.tables.leads.length})</h3>
            <div className="table-container" style={{ maxHeight: '300px', overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Company</th>
                    <th>Status</th>
                    <th>Assigned To</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.tables.leads.map(l => (
                    <tr key={l.id}>
                      <td style={{ fontWeight: 600 }}>{l.name}</td>
                      <td>{l.company}</td>
                      <td>{l.status}</td>
                      <td>{l.assigned_to || 'Unassigned'}</td>
                    </tr>
                  ))}
                  {reportData.tables.leads.length === 0 && (
                    <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No leads match the filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </>
      )}
    </div>
  );
};

export default ReportsPage;
