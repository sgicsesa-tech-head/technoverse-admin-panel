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

const PAGE_SIZE = 50;

function App() {
  const { allDocs, loading, error, fetchNow, lastFetched } = useRegistrations();
  const [eventFilter, setEventFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

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
          {lastFetched && (
            <div className="last-fetched">Last: {new Date(lastFetched).toLocaleString()}</div>
          )}
        </div>
      </div>
      {error && <div className="error-banner">⚠ {error}</div>}
      {loading ? (
        <div className="loader">Loading registrations…</div>
      ) : (
        <ParticipantsTable
          rows={pageRows}
          page={page}
          setPage={setPage}
          pageSize={PAGE_SIZE}
          totalFiltered={filtered.length}
        />
      )}
    </div>
  );
}

export default App;
