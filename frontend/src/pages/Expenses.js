import React, { useState, useEffect } from 'react';
import API from '../api/axios';
import { toast } from 'react-toastify';
import { FiTrash2, FiEdit2, FiCpu, FiCamera, FiX, FiCheck } from 'react-icons/fi';
import MonthSelector from '../components/MonthSelector';

const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Entertainment', 'Rent', 'Utilities', 'Household', 'Health', 'Education', 'Travel', 'Other'];

const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [form, setForm] = useState({
    description: '',
    amount: '',
    category: '',
    date: new Date().toISOString().split('T')[0],
    note: ''
  });
  const [editId, setEditId] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [loading, setLoading] = useState(true);

  // Receipt Scanner States
  const [scanLoading, setScanLoading] = useState(false);
  const [scanPreview, setScanPreview] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [scanItems, setScanItems] = useState([]);
  const [addingScanned, setAddingScanned] = useState(false);

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  useEffect(() => {
    fetchExpenses();
    // eslint-disable-next-line
  }, [selectedMonth, selectedYear]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/expenses?month=${selectedMonth}&year=${selectedYear}`);
      setExpenses(res.data);
    } catch (error) {
      toast.error('Failed to fetch expenses');
    } finally {
      setLoading(false);
    }
  };

  // AI Auto-Categorization (with learning + confidence)
  const handleAICategorize = async () => {
    if (!form.description.trim()) {
      toast.warn('Enter a description first');
      return;
    }

    try {
      setAiLoading(true);
      setAiResult(null);
      const res = await API.post('/ai/categorize', { description: form.description });
      const data = res.data;

      setForm(prev => ({ ...prev, category: data.category }));
      setAiResult(data);

      if (data.source === 'learned') {
        toast.success(`⚡ Instant: ${data.category} (from memory)`);
      } else if (data.source === 'fallback') {
        toast.info(`🔧 ${data.category} (keyword match — AI unavailable)`);
      } else {
        toast.success(`🤖 AI: ${data.category} (${data.confidence}% confident)`);
      }
    } catch (error) {
      toast.error('AI categorization failed');
    } finally {
      setAiLoading(false);
    }
  };

  // ===== Receipt Scanner =====
  const handleReceiptUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.warn('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.warn('Image too large. Max 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result;
      setScanPreview(base64);

      try {
        setScanLoading(true);
        setScanResult(null);
        setScanItems([]);

        const res = await API.post('/ai/scan-receipt', { image: base64 });
        const data = res.data.data;

        setScanResult(data);

        // Prepare editable items — always use TODAY's date so it appears in current month's list
        // Original bill date is saved in the note for reference
        const today = new Date().toISOString().split('T')[0];
        const billDate = data.date || today;
        const editableItems = data.items.map((item, index) => ({
          ...item,
          id: index,
          checked: true,
          date: today,
          note: item.itemDetails
            ? `Items: ${item.itemDetails} | Store: ${data.store}${billDate !== today ? ` | Bill date: ${billDate}` : ''}`
            : `Store: ${data.store}${billDate !== today ? ` | Bill date: ${billDate}` : ''}`
        }));

        setScanItems(editableItems);

        if (data.isMultiCategory) {
          toast.success(`📷 Multi-category bill! ${data.items.length} categories found — ₹${data.totalAmount}`);
        } else {
          toast.success(`📷 Receipt scanned! ${data.store} — ₹${data.totalAmount}`);
        }
      } catch (error) {
        console.error('Receipt scan error:', error);
        toast.error('Failed to scan receipt. Please try again.');
      } finally {
        setScanLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Update a scanned item field
  const updateScanItem = (id, field, value) => {
    setScanItems(prev =>
      prev.map(item => item.id === id ? { ...item, [field]: value } : item)
    );
  };

  // Toggle check/uncheck a scanned item
  const toggleScanItem = (id) => {
    setScanItems(prev =>
      prev.map(item => item.id === id ? { ...item, checked: !item.checked } : item)
    );
  };

  // Add all checked scanned items as expenses (works for BOTH single and multi-category)
  const handleAddAllScanned = async () => {
    const checkedItems = scanItems.filter(item => item.checked);

    if (checkedItems.length === 0) {
      toast.warn('No items selected to add');
      return;
    }

    // Validate amounts
    const invalidItems = checkedItems.filter(item => !item.amount || parseFloat(item.amount) <= 0);
    if (invalidItems.length > 0) {
      toast.warn(`${invalidItems.length} item(s) have invalid amounts. Please fix them.`);
      return;
    }

    try {
      setAddingScanned(true);
      let addedCount = 0;

      for (const item of checkedItems) {
        const expenseData = {
          description: item.description || 'Scanned Expense',
          amount: parseFloat(item.amount),
          category: item.category || 'Other',
          date: item.date || new Date().toISOString().split('T')[0],
          note: item.note || ''
        };

        console.log('Adding scanned expense:', expenseData);
        await API.post('/expenses', expenseData);
        addedCount++;
      }

      toast.success(`✅ ${addedCount} expense${addedCount > 1 ? 's' : ''} added from receipt!`);
      clearScanData();
      fetchExpenses();
    } catch (error) {
      console.error('Failed to add scanned expenses:', error.response?.data || error.message);
      toast.error(`Failed to add expenses: ${error.response?.data?.message || error.message}`);
    } finally {
      setAddingScanned(false);
    }
  };

  // Clear all scan data
  const clearScanData = () => {
    setScanPreview(null);
    setScanResult(null);
    setScanItems([]);
    const fileInput = document.getElementById('receipt-input');
    if (fileInput) fileInput.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.description || !form.amount || !form.category) {
      toast.warn('Please fill all required fields');
      return;
    }

    try {
      if (editId) {
        await API.put(`/expenses/${editId}`, {
          ...form,
          amount: parseFloat(form.amount)
        });
        toast.success('Expense updated!');
        setEditId(null);
      } else {
        await API.post('/expenses', {
          ...form,
          amount: parseFloat(form.amount)
        });
        toast.success('Expense added!');
      }
      setForm({ description: '', amount: '', category: '', date: new Date().toISOString().split('T')[0], note: '' });
      setAiResult(null);
      clearScanData();
      fetchExpenses();
    } catch (error) {
      toast.error('Failed to save expense');
    }
  };

  const handleEdit = (expense) => {
    setEditId(expense._id);
    setAiResult(null);
    clearScanData();
    setForm({
      description: expense.description,
      amount: expense.amount.toString(),
      category: expense.category,
      date: new Date(expense.date).toISOString().split('T')[0],
      note: expense.note || ''
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await API.delete(`/expenses/${id}`);
      toast.success('Expense deleted!');
      fetchExpenses();
    } catch (error) {
      toast.error('Failed to delete expense');
    }
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  const getConfidenceLevel = (confidence) => {
    if (confidence >= 80) return 'high';
    if (confidence >= 50) return 'medium';
    return 'low';
  };

  // Count checked items for the add button
  const checkedCount = scanItems.filter(i => i.checked).length;
  const checkedTotal = scanItems.filter(i => i.checked).reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);

  return (
    <div className="page">
      <div className="page-header-row">
        <h1 className="page-title">Expenses</h1>
        <MonthSelector
          month={selectedMonth}
          year={selectedYear}
          onChange={(m, y) => {
            setSelectedMonth(m);
            setSelectedYear(y);
            // Reset form, edit, and scan state when changing months
            setEditId(null);
            setForm({ description: '', amount: '', category: '', date: new Date().toISOString().split('T')[0], note: '' });
            setAiResult(null);
            clearScanData();
          }}
        />
      </div>

      {/* ===== Receipt Scanner Section ===== */}
      <div className="form-card">
        <h3>📷 Smart Receipt Scanner</h3>
        <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '12px' }}>
          Upload a receipt or bill photo — AI will extract and split expenses by category automatically.
        </p>
        <div className="receipt-upload">
          <label className="btn btn-ai upload-btn" htmlFor="receipt-input">
            <FiCamera /> {scanLoading ? '🔄 Scanning...' : 'Upload Receipt'}
          </label>
          <input
            id="receipt-input"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleReceiptUpload}
            style={{ display: 'none' }}
            disabled={scanLoading}
          />
          <span className="upload-hint">Supports: JPG, PNG (max 5MB) • Works with multi-category bills</span>
        </div>

        {/* Receipt Preview */}
        {scanPreview && (
          <div className="receipt-preview">
            <img src={scanPreview} alt="Receipt" />
            <button type="button" className="preview-close" onClick={clearScanData}>
              <FiX />
            </button>
          </div>
        )}

        {/* Scanning Loader */}
        {scanLoading && (
          <div className="scan-loading">
            <div className="scan-spinner"></div>
            <p>AI is analyzing your receipt...</p>
          </div>
        )}

        {/* ===== Scan Results (both single & multi category) ===== */}
        {scanResult && scanItems.length > 0 && !scanLoading && (
          <div className="scan-results">
            <div className="scan-results-header">
              <h4>🧾 {scanResult.isMultiCategory ? 'Bill Breakdown' : 'Scanned Receipt'} — {scanResult.store}</h4>
              <span className="scan-total">Total: ₹{scanResult.totalAmount.toLocaleString()}</span>
            </div>
            <p className="scan-results-hint">
              {scanResult.isMultiCategory
                ? `AI split this bill into ${scanItems.length} categories. Review, edit if needed, then add all.`
                : 'Review the scanned data below, edit if needed, then click Add Expense.'
              }
            </p>

            <div className="scan-items">
              {scanItems.map((item) => (
                <div key={item.id} className={`scan-item ${!item.checked ? 'scan-item-unchecked' : ''}`}>
                  {scanResult.isMultiCategory && (
                    <div className="scan-item-check">
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={() => toggleScanItem(item.id)}
                      />
                    </div>
                  )}
                  <div className="scan-item-body">
                    <div className="scan-item-row">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateScanItem(item.id, 'description', e.target.value)}
                        className="scan-item-input"
                        placeholder="Description"
                      />
                      <div className="scan-item-amount-wrapper">
                        <span className="currency-symbol">₹</span>
                        <input
                          type="number"
                          value={item.amount}
                          onChange={(e) => updateScanItem(item.id, 'amount', e.target.value)}
                          className="scan-item-amount"
                          placeholder="Amount"
                        />
                      </div>
                    </div>
                    <div className="scan-item-row">
                      <select
                        value={item.category}
                        onChange={(e) => updateScanItem(item.id, 'category', e.target.value)}
                        className="scan-item-select"
                      >
                        {CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                      <input
                        type="date"
                        value={item.date}
                        onChange={(e) => updateScanItem(item.id, 'date', e.target.value)}
                        className="scan-item-date"
                      />
                      {item.itemDetails && (
                        <span className="scan-item-details-text" title={item.itemDetails}>
                          📋 {item.itemDetails}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="scan-actions">
              <button
                className="btn btn-primary"
                onClick={handleAddAllScanned}
                disabled={addingScanned || checkedCount === 0}
              >
                {addingScanned ? (
                  '⏳ Adding...'
                ) : (
                  <>
                    <FiCheck /> Add {checkedCount} Expense{checkedCount !== 1 ? 's' : ''} (₹{checkedTotal.toLocaleString()})
                  </>
                )}
              </button>
              <button className="btn btn-secondary" onClick={clearScanData}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ===== Add/Edit Expense Form ===== */}
      <div className="form-card">
        <h3>{editId ? 'Edit Expense' : 'Add New Expense'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Description *</label>
              <div className="input-with-btn">
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => {
                    setForm({ ...form, description: e.target.value });
                    setAiResult(null);
                  }}
                  placeholder="e.g. Dominos pizza, Uber ride..."
                />
                <button
                  type="button"
                  onClick={handleAICategorize}
                  className="btn btn-ai"
                  disabled={aiLoading}
                  title="AI Auto-Categorize"
                >
                  <FiCpu /> {aiLoading ? 'Thinking...' : 'AI Categorize'}
                </button>
              </div>
            </div>
            <div className="form-group">
              <label>Amount (₹) *</label>
              <input
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="Enter amount"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Category *</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                <option value="">Select category</option>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              {/* AI Confidence Indicator */}
              {aiResult && (
                <div className={`ai-confidence ${getConfidenceLevel(aiResult.confidence)}`}>
                  <span className="confidence-icon">
                    {aiResult.source === 'learned' ? '⚡' : aiResult.source === 'fallback' ? '🔧' : '🤖'}
                  </span>
                  <div className="confidence-details">
                    <span className="confidence-label">
                      {aiResult.source === 'learned'
                        ? `From memory (used ${aiResult.usageCount} times)`
                        : aiResult.source === 'fallback'
                          ? 'Keyword match (AI unavailable)'
                          : `AI confidence: ${aiResult.confidence}%`
                      }
                    </span>
                    <div className="confidence-bar-wrapper">
                      <div className="confidence-bar">
                        <div
                          className="confidence-fill"
                          style={{ width: `${aiResult.confidence}%` }}
                        ></div>
                      </div>
                      <span className="confidence-percent">{aiResult.confidence}%</span>
                    </div>
                  </div>
                  {aiResult.confidence < 50 && (
                    <span className="confidence-warn">Please verify category</span>
                  )}
                </div>
              )}
            </div>
            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Note</label>
              <input
                type="text"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="Optional note"
              />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              {editId ? 'Update Expense' : 'Add Expense'}
            </button>
            {editId && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setEditId(null);
                  setAiResult(null);
                  setForm({ description: '', amount: '', category: '', date: new Date().toISOString().split('T')[0], note: '' });
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* ===== Expenses List ===== */}
      <div className="table-card">
        <div className="table-header">
          <h3>Expenses</h3>
          <span className="total-badge">Total: ₹{totalExpenses.toLocaleString()}</span>
        </div>
        {loading ? (
          <div className="loading">Loading...</div>
        ) : expenses.length === 0 ? (
          <div className="empty-state">No expenses recorded this month. Start by adding one above!</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map(expense => (
                <tr key={expense._id}>
                  <td>{new Date(expense.date).toLocaleDateString('en-IN')}</td>
                  <td>{expense.description}</td>
                  <td><span className="category-badge">{expense.category}</span></td>
                  <td className="amount-cell">₹{expense.amount.toLocaleString()}</td>
                  <td>
                    <button className="icon-btn edit" onClick={() => handleEdit(expense)} title="Edit">
                      <FiEdit2 />
                    </button>
                    <button className="icon-btn delete" onClick={() => handleDelete(expense._id)} title="Delete">
                      <FiTrash2 />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Expenses;
