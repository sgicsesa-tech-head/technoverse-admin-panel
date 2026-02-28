import React from 'react';

export default function Filters({
  events, selectedEvent, onSelectEvent,
  search, onSearch,
  teamType, onTeamType,
  statusFilter, onStatusFilter,
}) {
  return (
    <div className="filters-bar">
      <select value={selectedEvent || ''} onChange={(e) => onSelectEvent(e.target.value)}>
        <option value="">All Events</option>
        {events.map((ev) => (
          <option key={ev} value={ev}>{ev}</option>
        ))}
      </select>

      <select value={teamType || ''} onChange={(e) => onTeamType(e.target.value)}>
        <option value="">All Team Sizes</option>
        <option value="solo">Solo</option>
        <option value="team-small">Team (2–4)</option>
        <option value="team-large">Team (5+)</option>
      </select>

      <select value={statusFilter || ''} onChange={(e) => onStatusFilter(e.target.value)}>
        <option value="">All Statuses</option>
        <option value="verified">Verified</option>
        <option value="pending">Pending</option>
      </select>

      <input
        type="text"
        placeholder="Search by name, email, mobile or txn ID..."
        value={search}
        onChange={(e) => onSearch(e.target.value)}
      />
    </div>
  );
}
