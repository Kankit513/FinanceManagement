const Settings = require('../models/Settings');

const getSettings = async (req, res) => {
  try {
    const month = parseInt(req.query.month) || (new Date().getMonth() + 1);
    const year = parseInt(req.query.year) || new Date().getFullYear();

    let settings = await Settings.findOne({ month, year });
    if (!settings) {
      return res.json({ month, year, monthlyIncome: 0, isSet: false });
    }
    res.json({ ...settings.toObject(), isSet: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateSettings = async (req, res) => {
  try {
    const { monthlyIncome, month, year } = req.body;

    const m = parseInt(month) || (new Date().getMonth() + 1);
    const y = parseInt(year) || new Date().getFullYear();

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    if (m !== currentMonth || y !== currentYear) {
      return res.status(400).json({ message: 'Income can only be set/edited for the current month.' });
    }

    const settings = await Settings.findOneAndUpdate(
      { month: m, year: y },
      { monthlyIncome: parseFloat(monthlyIncome) || 0 },
      { upsert: true, new: true }
    );

    res.json({ ...settings.toObject(), isSet: true });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  getSettings,
  updateSettings
};
