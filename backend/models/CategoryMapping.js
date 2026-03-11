const mongoose = require('mongoose');

const categoryMappingSchema = new mongoose.Schema({
  keyword: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  category: {
    type: String,
    required: true
  },
  usageCount: {
    type: Number,
    default: 1
  }
}, { timestamps: true });

module.exports = mongoose.model('CategoryMapping', categoryMappingSchema);
