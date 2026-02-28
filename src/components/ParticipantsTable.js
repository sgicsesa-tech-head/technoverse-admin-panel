import React, { useState } from 'react';

/* ---------- CSV export ---------- */
function exportCSV(rows) {
  if (!rows.length) return;
  const headers = [
    'Name', 'Email', 'Mobile', 'College', 'Competition',
    'Team Event', 'Team Name', 'Team Size', 'Team Members',
    'Status', 'Transaction ID', 'Registered At',
  ];
  const csvRows = rows.map((r) => [
    r.candidateName,
    r.candidateEmail,
    r.candidatePhone,
    r.candidateCollege,
    r.competitionName,
    r.isTeamEvent ? 'Yes' : 'No',
    r.teamName || '',
    r.teamMemberCount ?? 1,
    formatTeamMembers(r.teamMembers),
    r.status,
    r.transactionId,
    formatDate(r.createdAt),
  ].map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','));
  const csv = [headers.join(','), ...csvRows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'registrations.csv';
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------- helpers ---------- */
function formatDate(val) {
  if (!val) return '';
  let d;
  if (val.toDate) {
    // Live Firestore Timestamp object
    d = val.toDate();
  } else if (val.seconds !== undefined) {
    // Serialised Firestore Timestamp: { seconds, nanoseconds } from localStorage
    d = new Date(val.seconds * 1000);
  } else {
    d = new Date(val);
  }
  if (isNaN(d)) return '';
  return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

function formatTeamMembers(members) {
  if (!members || !members.length) return '';
  return members.map((m) => m.name || m.email || '').filter(Boolean).join(', ');
}

/* ---------- component ---------- */
export default function ParticipantsTable({ rows, page, setPage, pageSize, totalFiltered, pendingChanges = {}, onStatusToggle }) {
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const [expandedRow, setExpandedRow] = useState(null);
  const toggle = (id) => setExpandedRow((prev) => (prev === id ? null : id));

  return (
    <div className="table-wrapper">
      <div className="table-toolbar">
        <span className="showing-label">
          Showing {rows.length} of {totalFiltered} registration{totalFiltered !== 1 ? 's' : ''}
        </span>
        <button className="export-btn" onClick={() => exportCSV(rows)}>
          ⬇ Export CSV
        </button>
      </div>

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>Email</th>
            <th>Mobile</th>
            <th>College</th>
            <th>Competition</th>
            <th>Team</th>
            <th>Size</th>
            <th>Status</th>
            <th>Txn ID</th>
            <th>Registered</th>
          </tr>
        </thead>
        <tbody>
              {rows.map((r, idx) => {
            const effectiveStatus = pendingChanges[r.id] ?? r.status;
            const isDirty = pendingChanges[r.id] !== undefined;
            const isToggleable = effectiveStatus === 'pending' || effectiveStatus === 'verified';
            return (
            <React.Fragment key={r.id}>
              <tr
                className={r.isTeamEvent ? 'team-row' : ''}
                onClick={() => r.isTeamEvent && toggle(r.id)}
                style={{ cursor: r.isTeamEvent ? 'pointer' : 'default' }}
              >
                <td>{(page - 1) * pageSize + idx + 1}</td>
                <td>{r.candidateName}</td>
                <td>{r.candidateEmail}</td>
                <td>{r.candidatePhone}</td>
                <td>{r.candidateCollege}</td>
                <td>{r.competitionName}</td>
                <td>{r.teamName || '—'}</td>
                <td>{r.teamMemberCount ?? 1}</td>
                <td>
                  <span
                    className={`badge ${effectiveStatus}${isToggleable ? ' badge-clickable' : ''}${isDirty ? ' badge-dirty' : ''}`}
                    title={isToggleable ? `Click to toggle status` : undefined}
                    onClick={isToggleable ? (e) => { e.stopPropagation(); onStatusToggle && onStatusToggle(r.id, effectiveStatus); } : undefined}
                  >
                    {isDirty && <span className="badge-dot">•</span>}
                    {effectiveStatus}
                  </span>
                </td>
                <td className="mono">{r.transactionId}</td>
                <td>{formatDate(r.createdAt)}</td>
              </tr>
              {/* Expanded team members */}
              {expandedRow === r.id && r.teamMembers && r.teamMembers.length > 0 && (
                <tr className="team-members-row">
                  <td></td>
                  <td colSpan={10}>
                    <div className="team-members-list">
                      <strong>Team Members:</strong>
                      <ul>
                        {r.teamMembers.map((m, i) => (
                          <li key={i}>
                            {m.name || 'N/A'} — {m.email || 'N/A'} — {m.phone || 'N/A'} — {m.college || 'N/A'}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={11} style={{ textAlign: 'center', padding: 24 }}>
                No registrations found.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="pagination">
        <button disabled={page <= 1} onClick={() => setPage(page - 1)}>← Prev</button>
        <span>Page {page} of {totalPages}</span>
        <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next →</button>
      </div>
    </div>
  );
}
