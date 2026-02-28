import React, { useMemo, useState } from 'react';
import './App.css';
import { db } from './firebase';
import { doc, updateDoc } from 'firebase/firestore';
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
  const [page, setPage] = useState(1);

  /* pending status changes: { [docId]: newStatus } — not yet pushed to Firestore */
  const [pendingChanges, setPendingChanges] = useState({});
  const [pushing, setPushing] = useState(false);
  const [pushError, setPushError] = useState(null);

  const hasPendingChanges = Object.keys(pendingChanges).length > 0;

  /* derive competition dropdown options from ALL docs (unfiltered) */
  const events = useMemo(() => getCompetitionNames(allDocs), [allDocs]);

  /* filtered rows (by event & search) */
  const filtered = useMemo(
    () => filterRegistrations(allDocs, { eventFilter, search }),
    [allDocs, eventFilter, search]
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

  /* push all pending changes to Firestore */
  async function handlePushUpdate() {
    if (!hasPendingChanges || pushing) return;
    setPushing(true);
    setPushError(null);
    try {
      await Promise.all(
        Object.entries(pendingChanges).map(([id, newStatus]) =>
          updateDoc(doc(db, 'registrations', id), { status: newStatus })
        )
      );
      updateLocalStatuses(pendingChanges);
      setPendingChanges({});
    } catch (err) {
      setPushError(err.message || 'Failed to push updates');
    } finally {
      setPushing(false);
    }
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
        />
        <div className="fetch-block">
          <button className="fetch-btn" onClick={fetchNow} disabled={loading}>
            {loading ? 'Fetching…' : 'Fetch from Firebase'}
          </button>
          <button
            className="push-btn"
            onClick={handlePushUpdate}
            disabled={!hasPendingChanges || pushing}
            title={hasPendingChanges ? `Push ${Object.keys(pendingChanges).length} change(s) to Firestore` : 'No pending changes'}
          >
            {pushing ? 'Pushing…' : `Push Update${hasPendingChanges ? ` (${Object.keys(pendingChanges).length})` : ''}`}
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
