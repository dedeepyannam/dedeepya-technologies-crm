import React from 'react';

const PipelineChart = ({ data }) => {
  // data = [{ name: 'New Lead', value: 1248, color: 'var(--neon-cyan)' }, ...]
  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <div className="card-neon animate-fade-in animate-delay-2" style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>Sales Pipeline</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Conversion overview</p>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.75rem' }}>
        {data.map((stage, idx) => {
          const widthPercent = maxValue === 0 ? 0 : (stage.value / maxValue) * 100;
          return (
            <div key={stage.name} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '100px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                {stage.name}
              </div>
              <div style={{ flex: 1, height: '24px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
                <div style={{
                  width: `${widthPercent}%`,
                  height: '100%',
                  background: stage.color,
                  boxShadow: `0 0 10px ${stage.color}`,
                  borderRadius: '12px',
                  transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
                  animation: `fadeInUp 0.5s ease forwards ${idx * 0.1}s`
                }}></div>
              </div>
              <div style={{ width: '50px', fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>
                {stage.value}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PipelineChart;
