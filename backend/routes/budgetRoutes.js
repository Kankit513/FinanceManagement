const express = require('express');
const router = express.Router();
const {
  getBudgets,
  setBudget,
  updateBudget,
  deleteBudget,
  getBudgetComparison
} = require('../controllers/budgetController');

router.get('/comparison', getBudgetComparison);
router.get('/', getBudgets);
router.post('/', setBudget);
router.put('/:id', updateBudget);
router.delete('/:id', deleteBudget);

module.exports = router;
