import React from 'react';
import { Calendar as CalendarIcon, Clock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const CalendarWidget = () => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dates = Array.from({ length: 31 }, (_, i) => i + 1);
  const today = new Date().getDate();

  return (
    <div className="card-neon animate-fade-in animate-delay-3" style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>Calendar</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
        </div>
        <CalendarIcon size={20} color="var(--neon-purple-bright)" />
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(7, 1fr)', 
        gap: '4px', 
        textAlign: 'center', 
        fontSize: '0.75rem', 
        fontWeight: 700, 
        color: 'var(--text-muted)',
        marginBottom: '0.5rem'
      }}>
        {days.map(d => <div key={d}>{d}</div>)}
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(7, 1fr)', 
        gap: '4px', 
        textAlign: 'center',
        flex: 1
      }}>
        {/* Placeholder days for August 1st starting on a Saturday (example) */}
        {Array.from({ length: 6 }).map((_, i) => <div key={`empty-${i}`}></div>)}
        
        {dates.map(d => {
          const isToday = d === today;
          const hasEvent = d === 15 || d === 22 || d === 28;
          return (
            <div key={d} style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: isToday ? 800 : 500,
              color: isToday ? '#fff' : 'var(--text-secondary)',
              background: isToday ? 'var(--neon-purple-bright)' : 'transparent',
              boxShadow: isToday ? 'var(--shadow-glow-purple)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => { if(!isToday) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
            onMouseOut={(e) => { if(!isToday) e.currentTarget.style.background = 'transparent' }}
            >
              {d}
              {hasEvent && !isToday && <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--neon-cyan)', marginTop: '2px' }}></div>}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
        <h4 style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Upcoming</h4>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--neon-cyan)', boxShadow: 'var(--shadow-glow-cyan)' }}></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>Product Demo</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={10} /> 10:00 AM</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--neon-pink)', boxShadow: 'var(--shadow-glow-pink)' }}></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>Sales Meeting</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={10} /> 2:30 PM</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarWidget;
