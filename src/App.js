import React, { useMemo, useState } from 'react';
import './App.css';
import useRegistrations, {
  computeTotalParticipants,
  getCompetitionNames,
  filterRegistrations,
} from './hooks/useParticipants';
import Header from './components/Header';
import Filters from './components/Filters';
import ParticipantsTable from './components/ParticipantsTable';
import Charts from './components/Charts';

const PAGE_SIZE = 50;

function App() {
  const { allDocs, loading, error, fetchNow, lastFetched, updateLocalStatuses } = useRegistrations();
  const [eventFilter, setEventFilter] = useState('');
  const [search, setSearch] = useState('');
  const [teamType, setTeamType] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  /* pending status changes: { [docId]: newStatus } — not yet pushed to Firestore */
  const [pendingChanges, setPendingChanges] = useState({});
  const [pushing] = useState(false);
  const [pushError] = useState(null);

  const hasPendingChanges = Object.keys(pendingChanges).length > 0;

  /* derive competition dropdown options from ALL docs (unfiltered) */
  const events = useMemo(() => getCompetitionNames(allDocs), [allDocs]);

  /* filtered rows (by event, team type, status & search) */
  const filtered = useMemo(
    () => filterRegistrations(allDocs, { eventFilter, search, teamType, statusFilter }),
    [allDocs, eventFilter, search, teamType, statusFilter]
  );

  /* stats — computed over the FILTERED set */
  const totalParticipants = useMemo(() => computeTotalParticipants(filtered), [filtered]);
  const totalRevenue = totalParticipants * 100;

  /* paginated slice */
  const pageRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  /* reset to page 1 when filters change */
  const handleEventChange = (v) => { setEventFilter(v); setPage(1); };
  const handleSearchChange = (v) => { setSearch(v); setPage(1); };
  const handleTeamTypeChange = (v) => { setTeamType(v); setPage(1); };
  const handleStatusFilterChange = (v) => { setStatusFilter(v); setPage(1); };

  /* toggle status locally (pending ↔ verified) */
  function handleStatusToggle(id, currentEffectiveStatus) {
    const originalStatus = allDocs.find((d) => d.id === id)?.status;
    const newStatus = currentEffectiveStatus === 'pending' ? 'verified' : 'pending';
    setPendingChanges((prev) => {
      // if the new status is the same as the original, remove from pending (no net change)
      if (newStatus === originalStatus) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: newStatus };
    });
  }

  /* push is disabled — updates local state only */
  async function handlePushUpdate() {
    if (!hasPendingChanges || pushing) return;
    updateLocalStatuses(pendingChanges);
    setPendingChanges({});
  }

  return (
    <div className="app">
      <Header
        totalRegistrations={filtered.length}
        totalParticipants={totalParticipants}
        totalRevenue={totalRevenue}
      />
      <div className="controls-row">
        <Filters
          events={events}
          selectedEvent={eventFilter}
          onSelectEvent={handleEventChange}
          search={search}
          onSearch={handleSearchChange}
          teamType={teamType}
          onTeamType={handleTeamTypeChange}
          statusFilter={statusFilter}
          onStatusFilter={handleStatusFilterChange}
        />
        <div className="fetch-block">
          <button className="fetch-btn" onClick={fetchNow} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
          <button
            className="push-btn"
            onClick={handlePushUpdate}
            disabled={!hasPendingChanges || pushing}
            title={hasPendingChanges ? `Apply ${Object.keys(pendingChanges).length} change(s)` : 'No pending changes'}
          >
            {pushing ? 'Applying…' : `Apply Update${hasPendingChanges ? ` (${Object.keys(pendingChanges).length})` : ''}`}
          </button>
          {lastFetched && (
            <div className="last-fetched">Last: {new Date(lastFetched).toLocaleString()}</div>
          )}
        </div>
      </div>
      {error && <div className="error-banner">⚠ {error}</div>}
      {pushError && <div className="error-banner">⚠ Push failed: {pushError}</div>}
      {loading ? (
        <div className="loader">Loading registrations…</div>
      ) : (
        <ParticipantsTable
          rows={pageRows}
          page={page}
          setPage={setPage}
          pageSize={PAGE_SIZE}
          totalFiltered={filtered.length}
          pendingChanges={pendingChanges}
          onStatusToggle={handleStatusToggle}
        />
      )}
      <Charts allDocs={allDocs} />
    </div>
  );
}

export default App;
