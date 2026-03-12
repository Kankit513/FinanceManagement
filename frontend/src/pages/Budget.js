import React, { useState, useEffect } from 'react';
import API from '../api/axios';
import { toast } from 'react-toastify';
import { FiTrash2, FiEdit2 } from 'react-icons/fi';
import MonthSelector from '../components/MonthSelector';

const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Entertainment', 'Rent', 'Utilities', 'Household', 'Health', 'Education', 'Travel', 'Other'];

const Budget = () => {
  const [budgets, setBudgets] = useState([]);
  const [comparison, setComparison] = useState([]);
  const [form, setForm] = useState({ category: '', limit: '' });
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthName = MONTH_NAMES[selectedMonth - 1];

  useEffect(() => {
    fetchBudgets();
  }, [selectedMonth, selectedYear]);

  const fetchBudgets = async () => {
    try {
      setLoading(true);
      const [budgetRes, comparisonRes] = await Promise.all([
        API.get(`/budgets?month=${selectedMonth}&year=${selectedYear}`),
        API.get(`/budgets/comparison?month=${selectedMonth}&year=${selectedYear}`)
      ]);
      setBudgets(budgetRes.data);
      setComparison(comparisonRes.data);
    } catch (error) {
      toast.error('Failed to fetch budgets');
    } finally {
      setLoading(false);
    }
  };

  const handleMonthChange = (m, y) => {
    setSelectedMonth(m);
    setSelectedYear(y);
    setEditId(null);
    setForm({ category: '', limit: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.category || !form.limit) {
      toast.warn('Please select category and enter limit');
      return;
    }

    if (!editId) {
      const existingBudget = budgets.find(b => b.category === form.category);
      if (existingBudget) {
        toast.warn(`Budget for "${form.category}" already exists (₹${existingBudget.limit.toLocaleString()}). Please edit the existing budget instead.`);
        return;
      }
    }

    try {
      if (editId) {
        await API.put(`/budgets/${editId}`, {
          category: form.category,
          limit: parseFloat(form.limit)
        });
        toast.success(`Budget updated for ${form.category}!`);
        setEditId(null);
      } else {
        await API.post('/budgets', {
          category: form.category,
          limit: parseFloat(form.limit),
          month: selectedMonth,
          year: selectedYear
        });
        toast.success(`Budget set for ${form.category}!`);
      }
      setForm({ category: '', limit: '' });
      fetchBudgets();
    } catch (error) {
      toast.error('Failed to save budget');
    }
  };

  const handleEdit = (budget) => {
    setEditId(budget._id);
    setForm({
      category: budget.category,
      limit: budget.limit.toString()
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditId(null);
    setForm({ category: '', limit: '' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this budget?')) return;
    try {
      await API.delete(`/budgets/${id}`);
      toast.success('Budget deleted!');
      if (editId === id) {
        setEditId(null);
        setForm({ category: '', limit: '' });
      }
      fetchBudgets();
    } catch (error) {
      toast.error('Failed to delete budget');
    }
  };

  const totalBudget = budgets.reduce((sum, b) => sum + b.limit, 0);
  const totalSpent = comparison.reduce((sum, c) => sum + c.spent, 0);

  return (
    <div className="page">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Budget Management</h1>
          <p className="page-subtitle">{monthName} {selectedYear}</p>
        </div>
        <MonthSelector
          month={selectedMonth}
          year={selectedYear}
          onChange={handleMonthChange}
        />
      </div>

      <div className="form-card">
        <h3>{editId ? '✏️ Edit Budget' : 'Set Monthly Budget'}</h3>
        {editId && (
          <p style={{ color: '#6366f1', fontSize: '0.85rem', marginBottom: '12px' }}>
            Editing budget for <strong>{form.category}</strong>. Change the limit below.
          </p>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                disabled={!!editId}
              >
                <option value="">Select category</option>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Budget Limit (₹)</label>
              <input
                type="number"
                value={form.limit}
                onChange={(e) => setForm({ ...form, limit: e.target.value })}
                placeholder="Enter budget limit"
              />
            </div>
            <div className="form-group form-group-btn">
              <button type="submit" className="btn btn-primary">
                {editId ? 'Update Budget' : 'Set Budget'}
              </button>
              {editId && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCancelEdit}
                  style={{ marginLeft: '8px' }}
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      <div className="summary-cards">
        <div className="card card-income">
          <h3>Total Budget</h3>
          <p className="card-amount">₹{totalBudget.toLocaleString()}</p>
        </div>
        <div className="card card-expense">
          <h3>Total Spent</h3>
          <p className="card-amount">₹{totalSpent.toLocaleString()}</p>
        </div>
        <div className={`card ${totalBudget - totalSpent >= 0 ? 'card-savings' : 'card-danger'}`}>
          <h3>Remaining</h3>
          <p className="card-amount">₹{(totalBudget - totalSpent).toLocaleString()}</p>
        </div>
      </div>

      <div className="table-card">
        <h3>Budget Status</h3>
        {loading ? (
          <div className="loading">Loading...</div>
        ) : comparison.length === 0 ? (
          <div className="empty-state">No budgets set and no expenses found. Set your first budget above!</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Budget</th>
                <th>Spent</th>
                <th>Remaining</th>
                <th>Usage</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((item, index) => {
                const budget = budgets.find(b => b.category === item.category);
                return (
                  <tr key={index} className={item.exceeded ? 'row-danger' : ''} style={item.noBudget ? { borderLeft: '3px solid #f59e0b' } : {}}>
                    <td>
                      <span className="category-badge">{item.category}</span>
                      {item.noBudget && (
                        <span style={{ fontSize: '0.7rem', color: '#f59e0b', display: 'block', marginTop: '4px' }}>
                          ⚠️ No budget set
                        </span>
                      )}
                    </td>
                    <td>{item.noBudget ? <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Not set</span> : `₹${item.budgetLimit.toLocaleString()}`}</td>
                    <td className="amount-cell">₹{item.spent.toLocaleString()}</td>
                    <td className={item.remaining < 0 ? 'text-danger' : 'text-success'}>
                      {item.noBudget ? <span style={{ color: '#94a3b8' }}>—</span> : `₹${item.remaining.toLocaleString()}`}
                    </td>
                    <td>
                      {item.noBudget ? (
                        <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.8rem' }}>N/A</span>
                      ) : (
                        <>
                          <div className="progress-bar">
                            <div
                              className={`progress-fill ${item.percentUsed > 100 ? 'danger' : item.percentUsed > 80 ? 'warning' : 'safe'}`}
                              style={{ width: `${Math.min(item.percentUsed, 100)}%` }}
                            ></div>
                          </div>
                          <span className="progress-text">{item.percentUsed}%</span>
                        </>
                      )}
                    </td>
                    <td>
                      {item.noBudget
                        ? <span className="status-badge warning">Untracked</span>
                        : item.exceeded
                          ? <span className="status-badge danger">Exceeded</span>
                          : item.percentUsed >= 80
                            ? <span className="status-badge warning">Near Limit</span>
                            : <span className="status-badge safe">On Track</span>
                      }
                    </td>
                    <td>
                      {item.noBudget ? (
                        <button
                          className="btn btn-primary"
                          style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                          onClick={() => {
                            setForm({ category: item.category, limit: '' });
                            setEditId(null);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          title="Set budget for this category"
                        >
                          + Set Budget
                        </button>
                      ) : budget && (
                        <>
                          <button className="icon-btn edit" onClick={() => handleEdit(budget)} title="Edit">
                            <FiEdit2 />
                          </button>
                          <button className="icon-btn delete" onClick={() => handleDelete(budget._id)} title="Delete">
                            <FiTrash2 />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Budget;
