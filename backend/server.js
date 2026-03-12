const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();

connectDB().then(async () => {
  try {
    const Settings = require('./models/Settings');
    await Settings.deleteMany({ month: { $exists: false } });
  } catch (err) {
  }

  try {
    const Budget = require('./models/Budget');
    const indexes = await Budget.collection.indexes();
    const oldIndex = indexes.find(idx => idx.key && idx.key.category === 1 && !idx.key.month && idx.unique);
    if (oldIndex) {
      await Budget.collection.dropIndex(oldIndex.name);
      console.log('Dropped old unique index on category field');
    }
  } catch (err) {
  }
});

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/api/expenses', require('./routes/expenseRoutes'));
app.use('/api/budgets', require('./routes/budgetRoutes'));
app.use('/api/settings', require('./routes/settingsRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));

app.get('/', (req, res) => {
  res.json({ message: 'Finance Manager API is running' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
