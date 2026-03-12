import React, { useState, useEffect } from 'react';
import API from '../api/axios';
import { toast } from 'react-toastify';
import ExpensePieChart from '../components/ExpensePieChart';
import BudgetVsActualChart from '../components/BudgetVsActualChart';
import BudgetAlert from '../components/BudgetAlert';
import MonthSelector from '../components/MonthSelector';

const Dashboard = () => {
  const [income, setIncome] = useState(0);
  const [incomeInput, setIncomeInput] = useState('');
  const [incomeIsSet, setIncomeIsSet] = useState(false);
  const [summary, setSummary] = useState({ summary: [], totalExpenses: 0 });
  const [comparison, setComparison] = useState([]);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const isCurrentMonth = selectedMonth === (now.getMonth() + 1) && selectedYear === now.getFullYear();
  const canEditIncome = isCurrentMonth;

  useEffect(() => {
    fetchDashboardData();
  }, [selectedMonth, selectedYear]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [settingsRes, summaryRes, comparisonRes] = await Promise.all([
        API.get(`/settings?month=${selectedMonth}&year=${selectedYear}`),
        API.get(`/expenses/summary?month=${selectedMonth}&year=${selectedYear}`),
        API.get(`/budgets/comparison?month=${selectedMonth}&year=${selectedYear}`)
      ]);
      setIncome(settingsRes.data.monthlyIncome);
      setIncomeInput(settingsRes.data.monthlyIncome.toString());
      setIncomeIsSet(settingsRes.data.isSet);
      setSummary(summaryRes.data);
      setComparison(comparisonRes.data);
    } catch (error) {
      console.error('Dashboard fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveIncome = async () => {
    if (!canEditIncome) {
      toast.warning('Income can only be set for the current month');
      return;
    }
    try {
      const value = parseFloat(incomeInput) || 0;
      await API.put('/settings', {
        monthlyIncome: value,
        month: selectedMonth,
        year: selectedYear
      });
      setIncome(value);
      setIncomeIsSet(true);
      toast.success('Monthly income saved!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update income');
    }
  };

  const savings = income - summary.totalExpenses;
  const savingsRate = income > 0 ? ((savings / income) * 100).toFixed(1) : 0;

  const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long' });

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="page">
      <div className="page-header-row">
        <h1 className="page-title">Financial Dashboard</h1>
        <MonthSelector
          month={selectedMonth}
          year={selectedYear}
          onChange={(m, y) => { setSelectedMonth(m); setSelectedYear(y); }}
        />
      </div>

      <div className="income-section">
        <label>Monthly Income for {monthName} {selectedYear} (₹):</label>
        <div className="income-input-group">
          <input
            type="number"
            value={incomeInput}
            onChange={(e) => setIncomeInput(e.target.value)}
            placeholder="Enter monthly income"
            disabled={!canEditIncome}
            style={!canEditIncome ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
          />
          {canEditIncome ? (
            <button onClick={handleSaveIncome} className="btn btn-primary">
              {incomeIsSet ? 'Update' : 'Save'}
            </button>
          ) : (
            <span className="income-locked-label" style={{
              fontSize: '0.8rem',
              color: '#94a3b8',
              fontStyle: 'italic',
              whiteSpace: 'nowrap'
            }}>
              🔒 Locked (past month)
            </span>
          )}
        </div>
      </div>

      <div className="summary-cards">
        <div className="card card-income">
          <h3>Income</h3>
          <p className="card-amount">₹{income.toLocaleString()}</p>
        </div>
        <div className="card card-expense">
          <h3>Expenses</h3>
          <p className="card-amount">₹{summary.totalExpenses.toLocaleString()}</p>
        </div>
        <div className="card card-savings">
          <h3>Savings</h3>
          <p className="card-amount">₹{savings.toLocaleString()}</p>
        </div>
        <div className="card card-rate">
          <h3>Savings Rate</h3>
          <p className="card-amount">{savingsRate}%</p>
        </div>
      </div>

      <BudgetAlert comparison={comparison} />

      <div className="charts-grid">
        <ExpensePieChart data={summary.summary} />
        <BudgetVsActualChart data={comparison} />
      </div>
    </div>
  );
};

export default Dashboard;
