import { useEffect, useMemo, useState } from 'react';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* ---------- fetch once on mount ---------- */
  useEffect(() => {
    if (!db) {
      setError('Firebase not configured — check your .env');
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const col = collection(db, 'registrations');
        const q = query(col, orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        if (!cancelled) setAllDocs(docs);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to fetch registrations');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { allDocs, loading, error };
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
export function filterRegistrations(rows, { eventFilter, search }) {
  let result = rows;

  if (eventFilter) {
    result = result.filter((r) => r.competitionName === eventFilter);
  }

  if (search) {
    const s = search.toLowerCase().trim();
    result = result.filter(
      (r) =>
        (r.candidateName || '').toLowerCase().includes(s) ||
        (r.candidateEmail || '').toLowerCase().includes(s) ||
        (r.candidatePhone || '').toLowerCase().includes(s)
    );
  }

  return result;
}
