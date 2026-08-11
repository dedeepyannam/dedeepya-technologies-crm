import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line } from 'recharts';

const KPICard = ({ title, value, percentage, trend, icon, color, data, delay }) => {
  const isUp = trend === 'up';
  
  return (
    <div className={`card-neon animate-fade-in ${delay || ''}`} style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Background glow blob */}
      <div style={{
        position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px',
        background: color, filter: 'blur(50px)', opacity: 0.15, borderRadius: '50%'
      }}></div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.25rem' }}>{title}</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', letterSpacing: '-1px' }}>{value}</div>
        </div>
        <div style={{ background: `rgba(255,255,255,0.05)`, padding: '0.5rem', borderRadius: '0.75rem', color: color, boxShadow: `0 0 10px ${color}40` }}>
          {icon}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
          {percentage != null ? (
            <>
              <span style={{ 
                display: 'flex', alignItems: 'center', gap: '0.1rem', fontWeight: 700,
                color: isUp ? 'var(--neon-green)' : 'var(--neon-pink)',
                background: isUp ? 'rgba(57, 255, 136, 0.1)' : 'rgba(255, 45, 154, 0.1)',
                padding: '0.1rem 0.4rem', borderRadius: '1rem'
              }}>
                {isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {percentage}%
              </span>
              <span style={{ color: 'var(--text-muted)' }}>from last month</span>
            </>
          ) : (
            <span style={{ 
              fontWeight: 600,
              color: 'var(--text-muted)',
              background: 'rgba(255,255,255,0.05)',
              padding: '0.15rem 0.6rem',
              borderRadius: '1rem',
              fontSize: '0.75rem',
              letterSpacing: '0.3px'
            }}>
              N/A vs last period
            </span>
          )}
        </div>

        {/* Mini Sparkline */}
        <div style={{ width: '60px', height: '30px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <Line type="monotone" dataKey="val" stroke={color} strokeWidth={2} dot={false} isAnimationActive={true} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default KPICard;
