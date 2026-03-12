const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  month: {
    type: Number,
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  monthlyIncome: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

settingsSchema.index({ month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('Settings', settingsSchema);
