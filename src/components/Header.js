import React from 'react';

export default function Header({ totalRegistrations, totalParticipants, totalRevenue }) {
  return (
    <div className="header">
      <h1>Technoverse — Admin Panel</h1>
      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-label">Registrations</span>
          <span className="stat-value">{totalRegistrations}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Participants</span>
          <span className="stat-value">{totalParticipants}</span>
        </div>
        <div className="stat-card accent">
          <span className="stat-label">Revenue</span>
          <span className="stat-value">₹{totalRevenue.toLocaleString('en-IN')}</span>
        </div>
      </div>
    </div>
  );
}
