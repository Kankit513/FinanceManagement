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

router.post('/categorize', categorizeExpense);
router.get('/budget-alerts', smartBudgetAlerts);
router.get('/patterns', spendingPatterns);
router.get('/suggestions', savingSuggestions);
router.post('/ask', askAI);
router.post('/scan-receipt', scanReceipt);

module.exports = router;
