import React, { useState } from 'react';
import API from '../api/axios';
import { toast } from 'react-toastify';
import { FiCpu, FiAlertTriangle, FiTrendingUp, FiDollarSign, FiMessageCircle } from 'react-icons/fi';
import MonthSelector from '../components/MonthSelector';

const AIInsights = () => {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const [budgetAlerts, setBudgetAlerts] = useState([]);
  const [patterns, setPatterns] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');

  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [loadingPatterns, setLoadingPatterns] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [loadingAsk, setLoadingAsk] = useState(false);

  const handleMonthChange = (m, y) => {
    setSelectedMonth(m);
    setSelectedYear(y);
    setBudgetAlerts([]);
    setPatterns([]);
    setSuggestions([]);
    setAnswer('');
  };

  const fetchBudgetAlerts = async () => {
    try {
      setLoadingAlerts(true);
      const res = await API.get(`/ai/budget-alerts?month=${selectedMonth}&year=${selectedYear}`);
      setBudgetAlerts(res.data);
    } catch (error) {
      toast.error('Failed to get AI budget alerts');
      setBudgetAlerts([]);
    } finally {
      setLoadingAlerts(false);
    }
  };

  const fetchPatterns = async () => {
    try {
      setLoadingPatterns(true);
      const res = await API.get(`/ai/patterns?month=${selectedMonth}&year=${selectedYear}`);
      setPatterns(res.data);
    } catch (error) {
      toast.error('Failed to analyze spending patterns');
      setPatterns([]);
    } finally {
      setLoadingPatterns(false);
    }
  };

  const fetchSuggestions = async () => {
    try {
      setLoadingSuggestions(true);
      const res = await API.get(`/ai/suggestions?month=${selectedMonth}&year=${selectedYear}`);
      setSuggestions(res.data);
    } catch (error) {
      toast.error('Failed to get saving suggestions');
      setSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleAskAI = async (e) => {
    e.preventDefault();
    if (!question.trim()) {
      toast.warn('Please enter a question');
      return;
    }

    try {
      setLoadingAsk(true);
      const res = await API.post(`/ai/ask?month=${selectedMonth}&year=${selectedYear}`, { question });
      setAnswer(res.data.answer);
    } catch (error) {
      toast.error('AI failed to answer');
      setAnswer('');
    } finally {
      setLoadingAsk(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">
            <FiCpu /> AI Financial Insights
          </h1>
          <p className="page-subtitle">Powered by Google Gemini AI</p>
        </div>
        <MonthSelector
          month={selectedMonth}
          year={selectedYear}
          onChange={handleMonthChange}
        />
      </div>

      <div className="ai-grid">

        <div className="ai-card">
          <div className="ai-card-header">
            <FiAlertTriangle className="ai-card-icon warning" />
            <h3>Smart Budget Alerts</h3>
          </div>
          <p className="ai-card-desc">AI analyzes your spending pace and predicts potential budget overruns.</p>
          <button
            className="btn btn-ai"
            onClick={fetchBudgetAlerts}
            disabled={loadingAlerts}
          >
            {loadingAlerts ? 'Analyzing...' : 'Check Budget Health'}
          </button>
          {budgetAlerts.length > 0 && (
            <div className="ai-results">
              {budgetAlerts.map((alert, index) => (
                <div key={index} className={`ai-alert ${alert.type}`}>
                  <span className="ai-alert-icon">
                    {alert.type === 'warning' ? '⚠️' : '✅'}
                  </span>
                  <div>
                    <strong>{alert.category}</strong>
                    <p>{alert.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="ai-card">
          <div className="ai-card-header">
            <FiTrendingUp className="ai-card-icon info" />
            <h3>Spending Pattern Analysis</h3>
          </div>
          <p className="ai-card-desc">AI detects trends in your spending behavior over 3 months ending in the selected month.</p>
          <button
            className="btn btn-ai"
            onClick={fetchPatterns}
            disabled={loadingPatterns}
          >
            {loadingPatterns ? 'Analyzing...' : 'Analyze Patterns'}
          </button>
          {patterns.length > 0 && (
            <div className="ai-results">
              {patterns.map((pattern, index) => (
                <div key={index} className="ai-pattern">
                  <span className="trend-icon">
                    {pattern.trend === 'up' ? '📈' : pattern.trend === 'down' ? '📉' : '➡️'}
                  </span>
                  <p>{pattern.insight}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="ai-card">
          <div className="ai-card-header">
            <FiDollarSign className="ai-card-icon success" />
            <h3>Saving Suggestions</h3>
          </div>
          <p className="ai-card-desc">AI recommends actionable ways to increase your savings.</p>
          <button
            className="btn btn-ai"
            onClick={fetchSuggestions}
            disabled={loadingSuggestions}
          >
            {loadingSuggestions ? 'Thinking...' : 'Get Suggestions'}
          </button>
          {suggestions.length > 0 && (
            <div className="ai-results">
              {suggestions.map((suggestion, index) => (
                <div key={index} className="ai-suggestion">
                  <span className="suggestion-icon">💡</span>
                  <div>
                    <p>{suggestion.suggestion}</p>
                    {suggestion.potentialSaving > 0 && (
                      <span className="potential-saving">
                        Potential saving: ₹{suggestion.potentialSaving.toLocaleString()}/month
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="ai-card ai-card-full">
          <div className="ai-card-header">
            <FiMessageCircle className="ai-card-icon info" />
            <h3>Ask AI About Your Finances</h3>
          </div>
          <p className="ai-card-desc">Ask any question about your spending, savings, or financial health.</p>
          <form onSubmit={handleAskAI} className="ai-ask-form">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder='e.g. "Where did I spend the most this month?"'
              className="ai-question-input"
            />
            <button
              type="submit"
              className="btn btn-ai"
              disabled={loadingAsk}
            >
              {loadingAsk ? 'Thinking...' : 'Ask AI'}
            </button>
          </form>
          {answer && (
            <div className="ai-answer">
              <span className="answer-icon">🤖</span>
              <p>{answer}</p>
            </div>
          )}
          <div className="sample-questions">
            <p>Try asking:</p>
            <div className="sample-chips">
              {[
                'Where did I spend the most this month?',
                'Am I within my budget?',
                'How can I save more money?',
                'What is my biggest expense category?'
              ].map((q, i) => (
                <button
                  key={i}
                  className="chip"
                  onClick={() => setQuestion(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIInsights;
