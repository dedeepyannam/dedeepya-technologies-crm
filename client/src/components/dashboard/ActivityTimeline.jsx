import React from 'react';
import { Circle } from 'lucide-react';

const ActivityTimeline = ({ activities }) => {
  return (
    <div className="card-neon animate-fade-in animate-delay-2" style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '1.25rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>Recent Activities</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Latest team interactions</p>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }}>
        <div style={{ position: 'relative', paddingLeft: '1rem' }}>
          {/* Vertical Line */}
          <div style={{ position: 'absolute', top: '10px', bottom: '10px', left: '15px', width: '2px', background: 'rgba(255,255,255,0.05)' }}></div>
          
          {activities.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No recent activities.</div>
          ) : (
            activities.map((act, idx) => (
              <div key={act.id || idx} style={{ position: 'relative', marginBottom: '1.25rem', paddingLeft: '1.5rem', animation: `fadeInUp 0.3s ease forwards ${idx * 0.1}s`, opacity: 0 }}>
                {/* Status Dot */}
                <div style={{ 
                  position: 'absolute', left: '-5px', top: '4px', width: '12px', height: '12px', borderRadius: '50%', 
                  background: act.color, boxShadow: `0 0 10px ${act.color}80`,
                  border: '2px solid var(--bg-card)'
                }}></div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff' }}>{act.title}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>{act.subtitle}</div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {act.time}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ActivityTimeline;
