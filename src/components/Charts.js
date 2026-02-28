import React, { useMemo } from 'react';

const PALETTE = [
  '#e50914', '#ff6b35', '#f7c59f', '#4fc3f7', '#1a936f',
  '#c77dff', '#f18f01', '#80deea', '#ffab40', '#a5d6a7',
  '#ef9a9a', '#90caf9', '#ffe082', '#b39ddb', '#80cbc4',
];

/* ---------- SVG donut chart helpers ---------- */

function polarToXY(cx, cy, r, deg) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

function makeDonutPath(cx, cy, R, innerR, startDeg, endDeg) {
  const [sx, sy] = polarToXY(cx, cy, R, startDeg);
  const [ex, ey] = polarToXY(cx, cy, R, endDeg);
  const [ix, iy] = polarToXY(cx, cy, innerR, endDeg);
  const [ox, oy] = polarToXY(cx, cy, innerR, startDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M${sx},${sy} A${R},${R},0,${large},1,${ex},${ey} L${ix},${iy} A${innerR},${innerR},0,${large},0,${ox},${oy} Z`;
}

/* ---------- Single donut chart ---------- */

function DonutChart({ title, data }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  const CX = 100, CY = 100, R = 82, innerR = 50;

  const slices = useMemo(() => {
    if (total === 0) return [];
    let angle = 0;
    return data.map((d, i) => {
      const deg = (d.count / total) * 360;
      const slice = {
        ...d,
        startAngle: angle,
        endAngle: angle + deg,
        color: PALETTE[i % PALETTE.length],
      };
      angle += deg;
      return slice;
    });
  }, [data, total]);

  return (
    <div className="chart-card">
      <h3 className="chart-title">{title}</h3>
      <div className="chart-body">
        <svg width={200} height={200} viewBox="0 0 200 200" className="donut-svg">
          {total === 0 ? (
            <circle cx={CX} cy={CY} r={R} fill="#252525" />
          ) : data.length === 1 ? (
            <>
              <circle cx={CX} cy={CY} r={R} fill={PALETTE[0]} />
              <circle cx={CX} cy={CY} r={innerR} fill="#141414" />
            </>
          ) : (
            slices.map((s, i) => (
              <path key={i} d={makeDonutPath(CX, CY, R, innerR, s.startAngle, s.endAngle)} fill={s.color} />
            ))
          )}
          {/* Center label */}
          <text x={CX} y={CY - 8} textAnchor="middle" fill="#e6e6e6" fontSize="22" fontWeight="700">
            {total}
          </text>
          <text x={CX} y={CY + 10} textAnchor="middle" fill="#999" fontSize="11">
            total
          </text>
        </svg>

        <div className="chart-legend">
          {data.map((d, i) => (
            <div key={i} className="legend-item">
              <span className="legend-dot" style={{ background: PALETTE[i % PALETTE.length] }} />
              <span className="legend-name" title={d.label}>{d.label}</span>
              <span className="legend-count">{d.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- Main Charts section ---------- */

export default function Charts({ allDocs }) {
  const compData = useMemo(() => {
    const map = {};
    allDocs.forEach((r) => {
      const key = r.competitionName || 'Unknown';
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  }, [allDocs]);

  const collegeData = useMemo(() => {
    const map = {};
    allDocs.forEach((r) => {
      const key = r.candidateCollege || 'Unknown';
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15); // top 15 colleges
  }, [allDocs]);

  if (allDocs.length === 0) return null;

  return (
    <div className="charts-section">
      <h2 className="charts-heading">Statistics</h2>
      <div className="charts-row">
        <DonutChart title="Registrations by Competition" data={compData} />
        <DonutChart title="Top Colleges" data={collegeData} />
      </div>
    </div>
  );
}
