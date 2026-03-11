const express = require('express');
const router = express.Router();
const {
  getExpenses,
  addExpense,
  updateExpense,
  deleteExpense,
  getExpenseSummary
} = require('../controllers/expenseController');

// GET /api/expenses/summary — must be before /:id
router.get('/summary', getExpenseSummary);

// GET /api/expenses
router.get('/', getExpenses);

// POST /api/expenses
router.post('/', addExpense);

// PUT /api/expenses/:id
router.put('/:id', updateExpense);

// DELETE /api/expenses/:id
router.delete('/:id', deleteExpense);

module.exports = router;
