import { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';

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

  const CACHE_KEY = 'registrations_cache_v1';

  // load cache synchronously on mount (no network call)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.docs)) {
          setAllDocs(parsed.docs);
          setLastFetched(parsed.timestamp ? new Date(parsed.timestamp) : null);
        }
      }
    } catch (e) {
      // ignore parse errors
    }
  }, []);

  // fetch function is manual — call when user clicks
  async function fetchNow() {
    if (!db) {
      setError('Firebase not configured — check your .env');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const col = collection(db, 'registrations');
      const q = query(col, orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setAllDocs(docs);
      const ts = new Date().toISOString();
      setLastFetched(new Date(ts));
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: ts, docs }));
      } catch (e) {
        // ignore quota errors
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch registrations');
    } finally {
      setLoading(false);
    }
  }

  function clearCache() {
    try { localStorage.removeItem(CACHE_KEY); } catch (e) {}
    setAllDocs([]);
    setLastFetched(null);
  }

  /** Apply a map of { [docId]: newStatus } to local state + cache without a network call */
  function updateLocalStatuses(changes) {
    setAllDocs((prev) => {
      const updated = prev.map((d) =>
        changes[d.id] ? { ...d, status: changes[d.id] } : d
      );
      try {
        const ts = lastFetched ? lastFetched.toISOString() : new Date().toISOString();
        localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: ts, docs: updated }));
      } catch (e) {}
      return updated;
    });
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
    result = result.filter(
      (r) =>
        (r.candidateName || '').toLowerCase().includes(s) ||
        (r.candidateEmail || '').toLowerCase().includes(s) ||
        (r.candidatePhone || '').toLowerCase().includes(s) ||
        (r.transactionId || '').toLowerCase().includes(s)
    );
  }

  return result;
}
