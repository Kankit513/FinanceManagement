import React from 'react';

const BudgetAlert = ({ comparison }) => {
  if (!comparison || comparison.length === 0) {
    return null;
  }

  const alerts = comparison.filter(item => item.percentUsed >= 80);

  if (alerts.length === 0) {
    return (
      <div className="budget-alert success">
        <span className="alert-icon">✅</span>
        <span>All budgets are on track! Keep it up.</span>
      </div>
    );
  }

  return (
    <div className="budget-alerts">
      {alerts.map((item, index) => (
        <div
          key={index}
          className={`budget-alert ${item.noBudget ? 'warning' : item.exceeded ? 'danger' : 'warning'}`}
        >
          <span className="alert-icon">{item.noBudget ? '📋' : item.exceeded ? '🚨' : '⚠️'}</span>
          <span>
            {item.noBudget
              ? `${item.category}: ₹${item.spent.toLocaleString()} spent with no budget set!`
              : item.exceeded
                ? `${item.category} budget exceeded by ₹${Math.abs(item.remaining).toLocaleString()}!`
                : `${item.category}: ${item.percentUsed}% used (₹${item.remaining.toLocaleString()} remaining)`
            }
          </span>
        </div>
      ))}
    </div>
  );
};

export default BudgetAlert;
