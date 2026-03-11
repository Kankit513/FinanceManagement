const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();

// Connect to MongoDB and run migrations
connectDB().then(async () => {
  try {
    const Settings = require('./models/Settings');
    // Remove old settings docs that don't have month/year (from previous schema)
    await Settings.deleteMany({ month: { $exists: false } });
  } catch (err) {
    // Ignore migration errors
  }

  try {
    const mongoose = require('mongoose');
    const Budget = require('./models/Budget');
    // Drop the old single-field unique index on 'category' if it exists
    // (it was replaced by the compound index { category, month, year })
    const indexes = await Budget.collection.indexes();
    const oldIndex = indexes.find(idx => idx.key && idx.key.category === 1 && !idx.key.month && idx.unique);
    if (oldIndex) {
      await Budget.collection.dropIndex(oldIndex.name);
      console.log('Dropped old unique index on category field');
    }
  } catch (err) {
    // Index may not exist, that's fine
  }
});

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/expenses', require('./routes/expenseRoutes'));
app.use('/api/budgets', require('./routes/budgetRoutes'));
app.use('/api/settings', require('./routes/settingsRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Finance Manager API is running' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
