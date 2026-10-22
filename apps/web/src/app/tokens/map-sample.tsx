import type { Direction, Palette } from './directions';

/**
 * A sample of the subway map in one direction's style: two paths sharing an interchange, done
 * segments solid and pending ones dashed (spec 01, M1). Static geometry: the real map is #117.
 */
export function MapSample({ direction, palette }: { direction: Direction; palette: Palette }) {
  const { stroke, stationRadius: r } = direction;
  const [line1, line2] = palette.lines;
  const offset = stroke + 2;
  const y1 = 36;
  const y2 = y1 + offset;
  const dash = `${String(stroke * 1.5)} ${String(stroke)}`;
  const cap = direction.id === 'b' ? 'round' : 'butt';
  const label = { fill: palette.foreground, fontSize: 11, fontFamily: 'var(--font-sans)' };

  return (
    <svg
      viewBox="0 0 320 136"
      className="h-auto w-full"
      role="img"
      aria-label="Sample map: two paths share an interchange marked you are here; segments before it are done and after it pending."
    >
      {/* Path 1: done up to the interchange, pending after it. */}
      <line
        x1={20}
        y1={y1}
        x2={196}
        y2={y1}
        stroke={line1}
        strokeWidth={stroke}
        strokeLinecap={cap}
      />
      <line
        x1={196}
        y1={y1}
        x2={300}
        y2={y1}
        stroke={line1}
        strokeWidth={stroke}
        strokeDasharray={dash}
        strokeLinecap={cap}
      />
      {/* Path 2: joins on a 45° segment, runs parallel through the interchange, then leaves. */}
      <polyline
        points={`40,100 100,100 ${String(100 + 100 - y2)},${String(y2)} 196,${String(y2)}`}
        fill="none"
        stroke={line2}
        strokeWidth={stroke}
        strokeLinejoin={cap === 'round' ? 'round' : 'miter'}
        strokeLinecap={cap}
      />
      <polyline
        points={`196,${String(y2)} 240,${String(y2)} ${String(240 + 100 - y2)},100`}
        fill="none"
        stroke={line2}
        strokeWidth={stroke}
        strokeDasharray={dash}
        strokeLinejoin={cap === 'round' ? 'round' : 'miter'}
        strokeLinecap={cap}
      />

      {/* Done stations: filled with the line color. */}
      <circle cx={48} cy={y1} r={r} fill={line1} stroke={palette.background} strokeWidth={2} />
      <circle cx={64} cy={100} r={r} fill={line2} stroke={palette.background} strokeWidth={2} />

      {/* Interchange, current: a pill across both lines, ringed in the foreground color. */}
      <rect
        x={196 - r}
        y={y1 - r}
        width={r * 2}
        height={offset + r * 2}
        rx={direction.id === 'b' ? r : 2}
        fill={palette.surface}
        stroke={palette.foreground}
        strokeWidth={2.5}
      />
      <text x={196} y={y2 + r + 16} textAnchor="middle" {...label} fontWeight={600}>
        You are here
      </text>

      {/* Pending station: hollow. */}
      <circle
        cx={256}
        cy={y1}
        r={r}
        fill={palette.background}
        stroke={palette.pending}
        strokeWidth={2.5}
      />

      {/* Terminals: the target roles. */}
      <rect
        x={300 - r}
        y={y1 - r}
        width={r * 2}
        height={r * 2}
        rx={direction.id === 'b' ? 3 : 0}
        fill={palette.foreground}
      />
      <rect
        x={300 - r}
        y={100 - r}
        width={r * 2}
        height={r * 2}
        rx={direction.id === 'b' ? 3 : 0}
        fill={palette.foreground}
      />
      <text x={300} y={y1 - r - 6} textAnchor="end" {...label}>
        Data Analyst
      </text>
      <text x={300 + r} y={100 + r + 16} textAnchor="end" {...label}>
        Support Ops Lead
      </text>
    </svg>
  );
}
