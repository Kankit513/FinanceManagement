const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
    enum: ['Food', 'Transport', 'Shopping', 'Entertainment', 'Rent', 'Utilities', 'Household', 'Health', 'Education', 'Travel', 'Other']
  },
  limit: {
    type: Number,
    required: true
  },
  month: {
    type: Number,
    required: true  // 1-12
  },
  year: {
    type: Number,
    required: true
  }
}, {
  timestamps: true
});

// Compound unique index: one budget per category per month
budgetSchema.index({ category: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('Budget', budgetSchema);
