import React from 'react';
import { NavLink } from 'react-router-dom';
import { FiHome, FiDollarSign, FiTarget, FiCpu } from 'react-icons/fi';

const Navbar = () => {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <FiDollarSign className="brand-icon" />
        <span>FinanceAI</span>
      </div>
      <div className="navbar-links">
        <NavLink to="/" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          <FiHome className="nav-icon" />
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/expenses" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          <FiDollarSign className="nav-icon" />
          <span>Expenses</span>
        </NavLink>
        <NavLink to="/budget" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          <FiTarget className="nav-icon" />
          <span>Budget</span>
        </NavLink>
        <NavLink to="/ai-insights" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          <FiCpu className="nav-icon" />
          <span>AI Insights</span>
        </NavLink>
      </div>
    </nav>
  );
};

export default Navbar;
