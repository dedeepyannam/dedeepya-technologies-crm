import React, { useState } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Sector } from 'recharts';

const renderActiveShape = (props) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, value } = props;
  return (
    <g>
      <text x={cx} y={cy - 10} dy={8} textAnchor="middle" fill="#fff" fontSize={24} fontWeight={800}>
        {value}
      </text>
      <text x={cx} y={cy + 15} dy={8} textAnchor="middle" fill="var(--text-muted)" fontSize={12} fontWeight={600}>
        {payload.name}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 10}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        style={{ filter: `drop-shadow(0 0 10px ${fill})` }}
      />
    </g>
  );
};

const LeadsSourceChart = ({ data, totalLeads }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  const onPieEnter = (_, index) => {
    setActiveIndex(index);
  };

  return (
    <div className="card-neon animate-fade-in animate-delay-2" style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>Leads by Source</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Top acquisition channels</p>
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              activeIndex={activeIndex}
              activeShape={renderActiveShape}
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={100}
              paddingAngle={5}
              dataKey="value"
              onMouseEnter={onPieEnter}
              stroke="none"
              isAnimationActive={true}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {activeIndex === null && (
           <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
             <div style={{ fontSize: '24px', fontWeight: 800, color: '#fff' }}>{totalLeads}</div>
             <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Total Leads</div>
           </div>
        )}
      </div>
    </div>
  );
};

export default LeadsSourceChart;
