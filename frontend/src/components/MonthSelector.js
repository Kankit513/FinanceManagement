import React from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MonthSelector = ({ month, year, onChange }) => {
  const handlePrev = () => {
    if (month === 1) {
      onChange(12, year - 1);
    } else {
      onChange(month - 1, year);
    }
  };

  const handleNext = () => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Don't allow going beyond current month
    if (year > currentYear || (year === currentYear && month >= currentMonth)) {
      return;
    }

    if (month === 12) {
      onChange(1, year + 1);
    } else {
      onChange(month + 1, year);
    }
  };

  const isCurrentMonth = () => {
    const now = new Date();
    return month === now.getMonth() + 1 && year === now.getFullYear();
  };

  return (
    <div className="month-selector">
      <button className="month-btn" onClick={handlePrev} title="Previous month">
        <FiChevronLeft />
      </button>
      <span className="month-label">
        {MONTH_NAMES[month - 1]} {year}
      </span>
      <button
        className="month-btn"
        onClick={handleNext}
        disabled={isCurrentMonth()}
        title={isCurrentMonth() ? 'Current month' : 'Next month'}
      >
        <FiChevronRight />
      </button>
    </div>
  );
};

export default MonthSelector;
