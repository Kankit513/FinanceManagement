const Budget = require('../models/Budget');
const Expense = require('../models/Expense');

const getBudgets = async (req, res) => {
  try {
    const { month, year } = req.query;
    let filter = {};

    if (month && year) {
      filter.month = parseInt(month);
      filter.year = parseInt(year);
    }

    const budgets = await Budget.find(filter);
    res.json(budgets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const setBudget = async (req, res) => {
  try {
    const { category, limit, month, year } = req.body;

    const budget = await Budget.findOneAndUpdate(
      { category, month, year },
      { category, limit, month, year },
      { upsert: true, new: true, runValidators: true }
    );

    res.status(201).json(budget);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateBudget = async (req, res) => {
  try {
    const budget = await Budget.findById(req.params.id);
    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }

    const { category, limit } = req.body;
    budget.category = category || budget.category;
    budget.limit = (limit !== undefined && limit !== null) ? limit : budget.limit;

    const updated = await budget.save();
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteBudget = async (req, res) => {
  try {
    const budget = await Budget.findById(req.params.id);
    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }

    await Budget.findByIdAndDelete(req.params.id);
    res.json({ message: 'Budget deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getBudgetComparison = async (req, res) => {
  try {
    const { month, year } = req.query;
    const m = parseInt(month) || (new Date().getMonth() + 1);
    const y = parseInt(year) || new Date().getFullYear();

    const budgets = await Budget.find({ month: m, year: y });

    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 0, 23, 59, 59);

    const actualSpending = await Expense.aggregate([
      { $match: { date: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: '$category',
          spent: { $sum: '$amount' }
        }
      }
    ]);

    const comparison = budgets.map(budget => {
      const actual = actualSpending.find(a => a._id === budget.category);
      const spent = actual ? actual.spent : 0;
      const remaining = budget.limit - spent;
      const percentUsed = budget.limit > 0 ? Math.round((spent / budget.limit) * 100) : 0;

      return {
        category: budget.category,
        budgetLimit: budget.limit,
        spent,
        remaining,
        percentUsed,
        exceeded: spent > budget.limit,
        noBudget: false
      };
    });

    const budgetedCategories = budgets.map(b => b.category);
    actualSpending.forEach(actual => {
      if (!budgetedCategories.includes(actual._id)) {
        comparison.push({
          category: actual._id,
          budgetLimit: 0,
          spent: actual.spent,
          remaining: -actual.spent,
          percentUsed: 100,
          exceeded: true,
          noBudget: true
        });
      }
    });

    res.json(comparison);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getBudgets,
  setBudget,
  updateBudget,
  deleteBudget,
  getBudgetComparison
};
