import { useState } from 'react';

// Remote Firestore fetching is disabled. The app operates on empty data only.

/**
 * Fetches ALL registrations from Firestore once and lets the UI
 * filter / search / paginate client-side.
 *
 * Participant count rule (from the user):
 *   - solo row (isTeamEvent === false) → 1 participant
 *   - team row (isTeamEvent === true)  → teamMemberCount participants
 *
 * Revenue = totalParticipants × ₹100
 */
export default function useRegistrations() {
  const [allDocs, setAllDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);

  // Fetch is a no-op — always resolves to empty data (no Firestore calls).
  async function fetchNow() {
    setLoading(true);
    setError(null);
    setAllDocs([]);
    setLastFetched(new Date());
    setLoading(false);
  }

  function clearCache() {
    setAllDocs([]);
    setLastFetched(null);
  }

  /** Apply a map of { [docId]: newStatus } to local state + cache without a network call */
  function updateLocalStatuses(changes) {
    setAllDocs((prev) =>
      prev.map((d) => (changes[d.id] ? { ...d, status: changes[d.id] } : d))
    );
  }

  return { allDocs, loading, error, fetchNow, clearCache, lastFetched, updateLocalStatuses };
}

/* -------- helper: compute total participant head-count -------- */
export function computeTotalParticipants(rows) {
  return rows.reduce((sum, r) => {
    if (r.isTeamEvent) {
      return sum + (Number(r.teamMemberCount) || 1);
    }
    return sum + 1;
  }, 0);
}

/* -------- helper: derive unique competition names -------- */
export function getCompetitionNames(rows) {
  const set = new Set(rows.map((r) => r.competitionName).filter(Boolean));
  return Array.from(set).sort();
}

/* -------- helper: client-side filter + search -------- */
export function filterRegistrations(rows, { eventFilter, search, teamType, statusFilter }) {
  let result = rows;

  if (eventFilter) {
    result = result.filter((r) => r.competitionName === eventFilter);
  }

  if (teamType) {
    if (teamType === 'solo') {
      result = result.filter((r) => !r.isTeamEvent);
    } else if (teamType === 'team-small') {
      result = result.filter((r) => r.isTeamEvent && (Number(r.teamMemberCount) || 1) >= 2 && (Number(r.teamMemberCount) || 1) <= 4);
    } else if (teamType === 'team-large') {
      result = result.filter((r) => r.isTeamEvent && (Number(r.teamMemberCount) || 1) >= 5);
    }
  }

  if (statusFilter) {
    result = result.filter((r) => (r.status || '').toLowerCase() === statusFilter.toLowerCase());
  }

  if (search) {
    const s = search.toLowerCase().trim();
    result = result.filter((r) => {
      if (
        (r.candidateName || '').toLowerCase().includes(s) ||
        (r.candidateEmail || '').toLowerCase().includes(s) ||
        (r.candidatePhone || '').toLowerCase().includes(s) ||
        (r.transactionId || '').toLowerCase().includes(s)
      ) return true;

      // also search through team members' name, email, phone
      if (Array.isArray(r.teamMembers)) {
        return r.teamMembers.some(
          (m) =>
            (m.name || '').toLowerCase().includes(s) ||
            (m.email || '').toLowerCase().includes(s) ||
            (m.phone || '').toLowerCase().includes(s)
        );
      }

      return false;
    });
  }

  return result;
}
