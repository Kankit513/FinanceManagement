const { GoogleGenerativeAI } = require('@google/generative-ai');
const Expense = require('../models/Expense');
const Budget = require('../models/Budget');
const Settings = require('../models/Settings');
const CategoryMapping = require('../models/CategoryMapping');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

const getFinancialContext = async (month, year) => {
  const m = parseInt(month);
  const y = parseInt(year);
  const startDate = new Date(y, m - 1, 1);
  const endDate = new Date(y, m, 0, 23, 59, 59);

  const expenses = await Expense.find({ date: { $gte: startDate, $lte: endDate } });
  const budgets = await Budget.find({ month: m, year: y });
  const settings = await Settings.findOne({ month: m, year: y });

  const categoryTotals = {};
  expenses.forEach(exp => {
    categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
  });

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const monthlyIncome = settings ? settings.monthlyIncome : 0;
  const savings = monthlyIncome - totalExpenses;
  const savingsRate = monthlyIncome > 0 ? ((savings / monthlyIncome) * 100).toFixed(1) : 0;

  return {
    expenses,
    budgets,
    categoryTotals,
    totalExpenses,
    monthlyIncome,
    savings,
    savingsRate,
    month: m,
    year: y
  };
};

const getMultiMonthData = async (baseMonth, baseYear, months = 3) => {
  const monthsData = [];

  for (let i = 0; i < months; i++) {
    const d = new Date(baseYear, baseMonth - 1 - i, 1);
    const m = d.getMonth() + 1;
    const y = d.getFullYear();
    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 0, 23, 59, 59);

    const expenses = await Expense.find({ date: { $gte: startDate, $lte: endDate } });

    const categoryTotals = {};
    expenses.forEach(exp => {
      categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
    });

    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    monthsData.push({
      month: m,
      year: y,
      label: `${d.toLocaleString('default', { month: 'long' })} ${y}`,
      categoryTotals,
      totalExpenses,
      expenseCount: expenses.length
    });
  }

  return monthsData;
};

const LOCAL_KEYWORDS = {
  Food: ['food', 'pizza', 'burger', 'lunch', 'dinner', 'breakfast', 'restaurant', 'swiggy', 'zomato', 'dominos', 'mcdonalds', 'biryani', 'coffee', 'tea', 'snack', 'meal', 'grocery', 'groceries', 'vegetables', 'fruits', 'milk', 'bread', 'rice', 'chicken', 'fish', 'egg', 'cake', 'ice cream', 'juice', 'water bottle', 'bigbasket', 'blinkit', 'dunzo'],
  Transport: ['uber', 'ola', 'cab', 'taxi', 'bus', 'metro', 'train', 'flight', 'petrol', 'diesel', 'fuel', 'parking', 'toll', 'auto', 'rickshaw', 'rapido', 'bike ride'],
  Shopping: ['amazon', 'flipkart', 'myntra', 'ajio', 'zara', 'h&m', 'clothes', 'shoes', 'jacket', 'shirt', 'jeans', 'dress', 'watch', 'bag', 'accessories', 'mall', 'dmart'],
  Entertainment: ['netflix', 'hotstar', 'prime', 'spotify', 'movie', 'cinema', 'pvr', 'inox', 'game', 'gaming', 'concert', 'show', 'youtube premium', 'disney', 'subscription'],
  Rent: ['rent', 'house rent', 'flat rent', 'room rent', 'pg rent', 'hostel'],
  Utilities: ['electricity', 'electric', 'water bill', 'gas bill', 'wifi', 'internet', 'broadband', 'phone bill', 'recharge', 'mobile bill', 'dth'],
  Household: ['maid', 'cook', 'servant', 'cleaning', 'laundry', 'iron', 'pest control', 'plumber', 'electrician', 'repair', 'maintenance', 'furniture'],
  Health: ['hospital', 'doctor', 'medicine', 'pharmacy', 'medical', 'clinic', 'dentist', 'gym', 'fitness', 'yoga', 'apollo', 'medplus', 'lab test', 'health insurance'],
  Education: ['course', 'udemy', 'coursera', 'book', 'books', 'tuition', 'coaching', 'school', 'college', 'exam', 'certificate', 'training', 'workshop'],
  Travel: ['hotel', 'flight', 'booking', 'trip', 'vacation', 'holiday', 'oyo', 'airbnb', 'makemytrip', 'goibibo', 'irctc', 'luggage', 'suitcase']
};

const fallbackCategorize = (description) => {
  const desc = description.toLowerCase();
  for (const [category, keywords] of Object.entries(LOCAL_KEYWORDS)) {
    for (const keyword of keywords) {
      if (desc.includes(keyword)) {
        return category;
      }
    }
  }
  return null;
};

const categorizeExpense = async (req, res) => {
  try {
    const { description } = req.body;

    if (!description) {
      return res.status(400).json({ message: 'Description is required' });
    }

    const normalizedDesc = description.toLowerCase().trim();
    const validCategories = ['Food', 'Transport', 'Shopping', 'Entertainment', 'Rent', 'Utilities', 'Household', 'Health', 'Education', 'Travel', 'Other'];

    const existingMapping = await CategoryMapping.findOne({ keyword: normalizedDesc });

    if (existingMapping) {
      existingMapping.usageCount += 1;
      await existingMapping.save();

      return res.json({
        category: existingMapping.category,
        description,
        source: 'learned',
        confidence: 99,
        usageCount: existingMapping.usageCount,
        message: `Categorized from memory (used ${existingMapping.usageCount} times)`
      });
    }

    try {
      const prompt = `You are a financial expense categorizer. Given the expense description, categorize it into EXACTLY ONE of these categories:
Food, Transport, Shopping, Entertainment, Rent, Utilities, Household, Health, Education, Travel, Other

Rules:
- Respond in this EXACT JSON format: {"category": "Food", "confidence": 85}
- confidence is 0-100 (how sure you are about this categorization)
- No extra text, only JSON.

Expense description: "${description}"`;

      const result = await model.generateContent(prompt);
      let responseText = result.response.text().trim();
      responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      const parsed = JSON.parse(responseText);
      const matchedCategory = validCategories.find(c => c.toLowerCase() === parsed.category.toLowerCase()) || 'Other';
      const confidence = Math.min(Math.max(parseInt(parsed.confidence) || 50, 0), 100);

      if (confidence > 70) {
        await CategoryMapping.findOneAndUpdate(
          { keyword: normalizedDesc },
          { keyword: normalizedDesc, category: matchedCategory, usageCount: 1 },
          { upsert: true, new: true }
        );
      }

      return res.json({
        category: matchedCategory,
        description,
        source: 'ai',
        confidence,
        usageCount: 0,
        message: `AI categorized with ${confidence}% confidence`
      });
    } catch (aiError) {
      console.error('Gemini API Error, using fallback:', aiError.message);

      const fallbackCategory = fallbackCategorize(description);

      if (fallbackCategory) {
        await CategoryMapping.findOneAndUpdate(
          { keyword: normalizedDesc },
          { keyword: normalizedDesc, category: fallbackCategory, usageCount: 1 },
          { upsert: true, new: true }
        );

        return res.json({
          category: fallbackCategory,
          description,
          source: 'fallback',
          confidence: 75,
          usageCount: 0,
          message: `Categorized using keyword matching (AI unavailable)`
        });
      }

      return res.json({
        category: 'Other',
        description,
        source: 'fallback',
        confidence: 10,
        usageCount: 0,
        message: 'Could not determine category. Please select manually.'
      });
    }
  } catch (error) {
    console.error('AI Categorization Error:', error);
    res.status(500).json({ message: 'AI categorization failed', error: error.message });
  }
};

const smartBudgetAlerts = async (req, res) => {
  try {
    const { month, year } = req.query;
    const m = parseInt(month) || (new Date().getMonth() + 1);
    const y = parseInt(year) || new Date().getFullYear();
    const data = await getFinancialContext(m, y);

    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();
    const isCurrentMonth = m === currentMonth && y === currentYear;

    const daysInMonth = new Date(y, m, 0).getDate();
    const dayOfMonth = isCurrentMonth ? today.getDate() : daysInMonth;
    const percentMonthPassed = isCurrentMonth ? ((dayOfMonth / daysInMonth) * 100).toFixed(0) : 100;

    const monthName = new Date(y, m - 1).toLocaleString('default', { month: 'long' });
    const timeContext = isCurrentMonth
      ? `Today is day ${dayOfMonth} of ${daysInMonth} (${percentMonthPassed}% of the month has passed).`
      : `This is a review of ${monthName} ${y} (month is complete).`;

    const budgetInfo = data.budgets.map(b => {
      const spent = data.categoryTotals[b.category] || 0;
      return `${b.category}: Budget ₹${b.limit}, Spent ₹${spent}, ${((spent / b.limit) * 100).toFixed(0)}% used`;
    }).join('\n');

    const budgetedCategories = data.budgets.map(b => b.category);
    const unbudgetedInfo = Object.entries(data.categoryTotals)
      .filter(([cat]) => !budgetedCategories.includes(cat))
      .map(([cat, amount]) => `${cat}: No budget set, Spent ₹${amount}`)
      .join('\n');

    const prompt = `You are a smart financial advisor AI. Analyze the following budget data and provide ${isCurrentMonth ? 'predictive alerts' : 'a review summary'}.

${timeContext}

Budget Status:
${budgetInfo || 'No budgets set'}
${unbudgetedInfo ? `\nUnbudgeted Spending:\n${unbudgetedInfo}` : ''}

Total Monthly Income: ₹${data.monthlyIncome}
Total Expenses ${isCurrentMonth ? 'So Far' : 'for the Month'}: ₹${data.totalExpenses}

Rules:
- Give 2-4 short, actionable alerts.
${isCurrentMonth
  ? '- For categories where spending pace exceeds the month\'s pace, warn about potential overspending.'
  : '- For categories that exceeded budget, highlight the overrun. For categories on track, acknowledge them.'}
- If any category has spending but no budget set, mention it as untracked spending.
- Use ⚠️ for warnings and ✅ for categories on track.
- Be specific with numbers.
- Keep each alert to 1-2 sentences.
- Format as a JSON array of objects with "type" (warning/success), "category", and "message" fields.

Respond ONLY with the JSON array, no extra text.`;

    const result = await model.generateContent(prompt);
    let responseText = result.response.text().trim();

    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    const alerts = JSON.parse(responseText);
    res.json(alerts);
  } catch (error) {
    console.error('Smart Budget Alerts Error:', error);
    res.status(500).json({ message: 'AI budget analysis failed', error: error.message });
  }
};

const spendingPatterns = async (req, res) => {
  try {
    const { month, year } = req.query;
    const m = parseInt(month) || (new Date().getMonth() + 1);
    const y = parseInt(year) || new Date().getFullYear();

    const monthsData = await getMultiMonthData(m, y, 3);
    const settings = await Settings.findOne({ month: m, year: y });
    const monthlyIncome = settings ? settings.monthlyIncome : 0;

    const dataStr = monthsData.map(md =>
      `${md.label}: Total ₹${md.totalExpenses}, Categories: ${JSON.stringify(md.categoryTotals)}`
    ).join('\n');

    const prompt = `You are a financial pattern analyst AI. Analyze the following multi-month spending data and identify trends.

Monthly Income: ₹${monthlyIncome}

Spending Data (most recent first):
${dataStr}

Rules:
- Identify 3-5 key spending patterns or trends.
- Mention specific percentage changes where applicable.
- Highlight increasing, decreasing, or stable trends by category.
- Be specific with numbers and categories.
- Format as a JSON array of objects with "insight" (string) and "trend" (up/down/stable) fields.

Respond ONLY with the JSON array, no extra text.`;

    const result = await model.generateContent(prompt);
    let responseText = result.response.text().trim();

    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    const patterns = JSON.parse(responseText);
    res.json(patterns);
  } catch (error) {
    console.error('Spending Patterns Error:', error);
    res.status(500).json({ message: 'AI pattern analysis failed', error: error.message });
  }
};

const savingSuggestions = async (req, res) => {
  try {
    const { month, year } = req.query;
    const data = await getFinancialContext(month || new Date().getMonth() + 1, year || new Date().getFullYear());

    const categoryBreakdown = Object.entries(data.categoryTotals)
      .map(([cat, amount]) => `${cat}: ₹${amount}`)
      .join('\n');

    const prompt = `You are a personal finance advisor AI. Based on the following financial data, suggest actionable ways to save money.

Monthly Income: ₹${data.monthlyIncome}
Total Expenses: ₹${data.totalExpenses}
Current Savings: ₹${data.savings}
Savings Rate: ${data.savingsRate}%

Spending by Category:
${categoryBreakdown || 'No expenses recorded'}

Rules:
- Give 3-5 specific, actionable saving suggestions.
- Include projected savings amounts (e.g., "If you reduce X by 20%, you save ₹Y").
- Prioritize categories with highest spending.
- Be encouraging and practical.
- Format as a JSON array of objects with "suggestion" (string) and "potentialSaving" (number) fields.

Respond ONLY with the JSON array, no extra text.`;

    const result = await model.generateContent(prompt);
    let responseText = result.response.text().trim();

    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    const suggestions = JSON.parse(responseText);
    res.json(suggestions);
  } catch (error) {
    console.error('Saving Suggestions Error:', error);
    res.status(500).json({ message: 'AI suggestions failed', error: error.message });
  }
};

const askAI = async (req, res) => {
  try {
    const { question } = req.body;
    const { month, year } = req.query;

    if (!question) {
      return res.status(400).json({ message: 'Question is required' });
    }

    const data = await getFinancialContext(month || new Date().getMonth() + 1, year || new Date().getFullYear());

    const categoryBreakdown = Object.entries(data.categoryTotals)
      .map(([cat, amount]) => `${cat}: ₹${amount}`)
      .join('\n');

    const recentExpenses = data.expenses.slice(0, 10).map(e =>
      `${e.description} - ₹${e.amount} (${e.category}) on ${new Date(e.date).toLocaleDateString()}`
    ).join('\n');

    const budgetInfo = data.budgets.map(b => {
      const spent = data.categoryTotals[b.category] || 0;
      return `${b.category}: Budget ₹${b.limit}, Spent ₹${spent}`;
    }).join('\n');

    const prompt = `You are a helpful personal finance assistant. Answer the user's question based on their financial data.

Financial Summary:
- Monthly Income: ₹${data.monthlyIncome}
- Total Expenses: ₹${data.totalExpenses}
- Savings: ₹${data.savings}
- Savings Rate: ${data.savingsRate}%

Spending by Category:
${categoryBreakdown || 'No expenses recorded'}

Budget Status:
${budgetInfo || 'No budgets set'}

Recent Expenses:
${recentExpenses || 'No recent expenses'}

User's Question: "${question}"

Rules:
- Answer clearly and concisely in 2-4 sentences.
- Use specific numbers from the data.
- Be helpful and provide financial insights.
- If the question can't be answered with available data, say so politely.

Answer:`;

    const result = await model.generateContent(prompt);
    const answer = result.response.text().trim();

    res.json({ question, answer });
  } catch (error) {
    console.error('AI Q&A Error:', error);
    res.status(500).json({ message: 'AI Q&A failed', error: error.message });
  }
};

const scanReceipt = async (req, res) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ message: 'Receipt image is required' });
    }

    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');

    const prompt = `You are a smart receipt/bill scanner AI. Analyze this receipt image and extract expense information.

IMPORTANT: If the bill contains items from MULTIPLE categories (e.g., a supermarket bill with groceries AND cleaning supplies AND medicines), you MUST split them into separate entries by category.

Rules:
- Respond in this EXACT JSON format:
{
  "store": "Store/Restaurant name",
  "date": "2026-03-10",
  "totalAmount": 2340,
  "items": [
    {
      "description": "Groceries from BigBasket",
      "amount": 1500,
      "category": "Food",
      "itemDetails": "Rice, Dal, Vegetables, Milk"
    },
    {
      "description": "Household supplies from BigBasket",
      "amount": 540,
      "category": "Household",
      "itemDetails": "Detergent, Floor cleaner"
    },
    {
      "description": "Medicines from BigBasket",
      "amount": 300,
      "category": "Health",
      "itemDetails": "Crocin, Band-aids"
    }
  ]
}

- "totalAmount" is the full bill total (number, no currency symbol)
- Each item in the "items" array represents a CATEGORY GROUP, not individual products
- Group products by their category and sum their amounts
- "description" should be like "Category items from StoreName"
- "itemDetails" lists the actual products in that category group
- "amount" for each item should be the subtotal for that category group
- Sum of all item amounts should equal (or be close to) totalAmount
- date in YYYY-MM-DD format. If not visible, use today: ${new Date().toISOString().split('T')[0]}
- category must be ONE of: Food, Transport, Shopping, Entertainment, Rent, Utilities, Household, Health, Education, Travel, Other
- If the bill is from a single category (e.g., restaurant), return just ONE item in the array
- If you can't read something clearly, make your best guess
- Respond ONLY with JSON, no extra text.`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64Data
        }
      }
    ]);

    let responseText = result.response.text().trim();
    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    const parsed = JSON.parse(responseText);
    console.log('Gemini Receipt Response:', JSON.stringify(parsed, null, 2));

    const cleanAmount = (val) => {
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
        const cleaned = val.replace(/[^0-9.\-]/g, '');
        return parseFloat(cleaned) || 0;
      }
      return 0;
    };

    const validCategories = ['Food', 'Transport', 'Shopping', 'Entertainment', 'Rent',
                             'Utilities', 'Household', 'Health', 'Education', 'Travel', 'Other'];

    const validatedItems = (parsed.items || []).map(item => ({
      description: item.description || 'Expense',
      amount: cleanAmount(item.amount),
      category: validCategories.find(c => c.toLowerCase() === item.category?.toLowerCase()) || 'Other',
      itemDetails: item.itemDetails || ''
    }));

    if (validatedItems.length === 0) {
      validatedItems.push({
        description: `Purchase from ${parsed.store || 'Unknown Store'}`,
        amount: cleanAmount(parsed.totalAmount),
        category: 'Other',
        itemDetails: ''
      });
    }

    console.log('Validated Items:', JSON.stringify(validatedItems, null, 2));

    res.json({
      success: true,
      data: {
        store: parsed.store || 'Unknown Store',
        date: parsed.date || new Date().toISOString().split('T')[0],
        totalAmount: cleanAmount(parsed.totalAmount),
        items: validatedItems,
        isMultiCategory: validatedItems.length > 1
      },
      message: validatedItems.length > 1
        ? `Receipt split into ${validatedItems.length} categories`
        : 'Receipt scanned successfully'
    });

  } catch (error) {
    console.error('Receipt Scan Error:', error);
    res.status(500).json({ message: 'Failed to scan receipt', error: error.message });
  }
};

module.exports = {
  categorizeExpense,
  smartBudgetAlerts,
  spendingPatterns,
  savingSuggestions,
  askAI,
  scanReceipt
};
