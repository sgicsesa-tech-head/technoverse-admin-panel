import React from 'react';

export default function Filters({ events, selectedEvent, onSelectEvent, search, onSearch }) {
  return (
    <div className="filters-bar">
      <select value={selectedEvent || ''} onChange={(e) => onSelectEvent(e.target.value)}>
        <option value="">All Events</option>
        {events.map((ev) => (
          <option key={ev} value={ev}>{ev}</option>
        ))}
      </select>
      <input
        type="text"
        placeholder="Search by name, email or mobile..."
        value={search}
        onChange={(e) => onSearch(e.target.value)}
      />
    </div>
  );
}
