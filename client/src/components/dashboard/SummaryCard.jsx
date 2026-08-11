import React from 'react';
import { ResponsiveContainer, LineChart, Line } from 'recharts';

const SummaryCard = ({ title, value, subtitle, icon, color, data, delay }) => {
  return (
    <div className={`card-neon animate-fade-in ${delay || ''}`} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
      <div style={{ 
        width: '48px', height: '48px', borderRadius: '12px', background: `rgba(255,255,255,0.05)`, 
        display: 'flex', alignItems: 'center', justifyContent: 'center', 
        color: color, border: `1px solid ${color}40`, boxShadow: `0 0 15px ${color}30`
      }}>
        {icon}
      </div>
      
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{title}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>{value}</span>
          <span style={{ fontSize: '0.75rem', color: color, fontWeight: 600 }}>{subtitle}</span>
        </div>
      </div>

      <div style={{ width: '60px', height: '30px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <Line type="monotone" dataKey="val" stroke={color} strokeWidth={2} dot={false} isAnimationActive={true} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SummaryCard;
