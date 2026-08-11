import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'rgba(11, 6, 21, 0.9)',
        border: '1px solid var(--neon-purple)',
        boxShadow: 'var(--shadow-glow-purple)',
        padding: '1rem',
        borderRadius: '0.75rem',
        color: '#fff'
      }}>
        <p style={{ fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-muted)' }}>{label}</p>
        {payload.map((entry, index) => (
          <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: entry.color }}></div>
            <span style={{ fontWeight: 600 }}>{entry.name}:</span>
            <span>{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const SalesChart = ({ data }) => {
  return (
    <div className="card-neon animate-fade-in animate-delay-1" style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>Sales Overview</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Leads vs Opportunities vs Customers</p>
        </div>
      </div>
      
      <div style={{ flex: 1, width: '100%', position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--neon-cyan)" stopOpacity={0.5}/>
                <stop offset="95%" stopColor="var(--neon-cyan)" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorOpps" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--neon-purple-bright)" stopOpacity={0.5}/>
                <stop offset="95%" stopColor="var(--neon-purple-bright)" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorCust" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--neon-pink)" stopOpacity={0.5}/>
                <stop offset="95%" stopColor="var(--neon-pink)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2 }} />
            
            <Area type="monotone" dataKey="leads" name="Leads" stroke="var(--neon-cyan)" strokeWidth={3} fillOpacity={1} fill="url(#colorLeads)" activeDot={{ r: 6, fill: 'var(--neon-cyan)', stroke: '#fff', strokeWidth: 2 }} />
            <Area type="monotone" dataKey="opportunities" name="Opportunities" stroke="var(--neon-purple-bright)" strokeWidth={3} fillOpacity={1} fill="url(#colorOpps)" activeDot={{ r: 6, fill: 'var(--neon-purple-bright)', stroke: '#fff', strokeWidth: 2 }} />
            <Area type="monotone" dataKey="customers" name="Customers" stroke="var(--neon-pink)" strokeWidth={3} fillOpacity={1} fill="url(#colorCust)" activeDot={{ r: 6, fill: 'var(--neon-pink)', stroke: '#fff', strokeWidth: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SalesChart;
