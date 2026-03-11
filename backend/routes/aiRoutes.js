const express = require('express');
const router = express.Router();
const {
  categorizeExpense,
  smartBudgetAlerts,
  spendingPatterns,
  savingSuggestions,
  askAI,
  scanReceipt
} = require('../controllers/aiController');

// POST /api/ai/categorize — Auto expense categorization
router.post('/categorize', categorizeExpense);

// GET /api/ai/budget-alerts — Smart budget alerts
router.get('/budget-alerts', smartBudgetAlerts);

// GET /api/ai/patterns — Spending pattern analysis
router.get('/patterns', spendingPatterns);

// GET /api/ai/suggestions — Saving suggestions
router.get('/suggestions', savingSuggestions);

// POST /api/ai/ask — Natural language Q&A
router.post('/ask', askAI);

// POST /api/ai/scan-receipt — Smart Receipt Scanner
router.post('/scan-receipt', scanReceipt);

module.exports = router;
