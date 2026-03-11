const express = require('express');
const router = express.Router();
const {
  getBudgets,
  setBudget,
  updateBudget,
  deleteBudget,
  getBudgetComparison
} = require('../controllers/budgetController');

// GET /api/budgets/comparison — must be before /:id
router.get('/comparison', getBudgetComparison);

// GET /api/budgets
router.get('/', getBudgets);

// POST /api/budgets
router.post('/', setBudget);

// PUT /api/budgets/:id
router.put('/:id', updateBudget);

// DELETE /api/budgets/:id
router.delete('/:id', deleteBudget);

module.exports = router;
