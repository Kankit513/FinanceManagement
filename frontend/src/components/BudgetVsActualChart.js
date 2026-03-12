import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

const CustomLegend = () => {
  const items = [
    { name: 'Budget', color: '#6366f1' },
    { name: 'Actual (on track)', color: '#10b981' },
    { name: 'Actual (exceeded)', color: '#f43f5e' }
  ];

  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', paddingTop: '8px', fontSize: '12px' }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{ width: 10, height: 10, backgroundColor: item.color, borderRadius: 2 }} />
          <span style={{ color: '#475569' }}>{item.name}</span>
        </div>
      ))}
    </div>
  );
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;

  const entry = payload[0]?.payload;
  const exceeded = entry?.exceeded;

  return (
    <div style={{
      background: 'white',
      borderRadius: '8px',
      border: '1px solid #e2e8f0',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      padding: '10px 14px',
      fontSize: '0.85rem'
    }}>
      <p style={{ margin: '0 0 6px', fontWeight: 600, color: '#1a1a2e' }}>{label}</p>
      {payload.map((item, i) => {
        const color = item.dataKey === 'Actual'
          ? (exceeded ? '#f43f5e' : '#10b981')
          : item.color;
        return (
          <p key={i} style={{ margin: '2px 0', color }}>
            {item.dataKey} : ₹{item.value.toLocaleString()}
          </p>
        );
      })}
    </div>
  );
};

const BudgetVsActualChart = ({ data }) => {
  const chartData = data.map(item => ({
    name: item.category,
    Budget: item.budgetLimit,
    Actual: item.spent,
    exceeded: item.spent > item.budgetLimit
  }));

  if (chartData.length === 0) {
    return <div className="chart-empty">No budget data to display</div>;
  }

  return (
    <div className="chart-container">
      <h3>Budget vs Actual Spending</h3>
      <ResponsiveContainer width="100%" height={380}>
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 20, left: 10, bottom: 20 }}
          barCategoryGap="20%"
          barGap={4}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: '#475569' }}
            angle={chartData.length > 4 ? -30 : 0}
            textAnchor={chartData.length > 4 ? 'end' : 'middle'}
            height={chartData.length > 4 ? 60 : 40}
            interval={0}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickFormatter={(v) => {
              if (v >= 1000) return `₹${(v / 1000).toFixed(0)}k`;
              return `₹${v}`;
            }}
            width={55}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
          />
          <Legend content={<CustomLegend />} />
          <Bar dataKey="Budget" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={40} />
          <Bar dataKey="Actual" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.exceeded ? '#f43f5e' : '#10b981'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BudgetVsActualChart;
