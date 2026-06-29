import { SkillAxis } from '../lib/skills';

interface SkillRadarProps {
  axes: SkillAxis[];
  /** Square viewBox size in px units. */
  size?: number;
  /** Optional interview-ready threshold ring (e.g. 75). */
  target?: number | null;
  /** Categories to highlight (e.g. those a selected role emphasises). */
  emphasized?: Set<string>;
  showLabels?: boolean;
  className?: string;
}

/**
 * Data-driven radar shared by the dashboard preview and the Readiness page.
 * Geometry is computed from the axis values (no hand-placed coordinates), so
 * the same skills always render identically wherever it's used. Renders
 * nothing for fewer than 3 axes — the caller shows an empty state.
 */
export default function SkillRadar({
  axes,
  size = 320,
  target = null,
  emphasized,
  showLabels = true,
  className,
}: SkillRadarProps) {
  const n = axes.length;
  if (n < 3) return null;

  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.37;
  const labelR = size * 0.44;

  const angleFor = (i: number) => (i / n) * 2 * Math.PI - Math.PI / 2;
  const pointAt = (i: number, v: number): [number, number] => {
    const a = angleFor(i);
    const r = (Math.max(0, Math.min(100, v)) / 100) * maxR;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  const toStr = (pts: [number, number][]) => pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

  const currentPoly = toStr(axes.map((ax, i) => pointAt(i, ax.value)));
  const targetPoly = target != null ? toStr(axes.map((_, i) => pointAt(i, target))) : null;
  const rings = [0.25, 0.5, 0.75, 1].map((f) =>
    toStr(
      axes.map((_, i) => {
        const a = angleFor(i);
        return [cx + f * maxR * Math.cos(a), cy + f * maxR * Math.sin(a)] as [number, number];
      }),
    ),
  );

  return (
    <svg className={className} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
      {/* Grid rings + axis spokes */}
      <g fill="none" stroke="#2d3748" strokeWidth="1">
        {rings.map((r, i) => (
          <polygon key={i} points={r} />
        ))}
        {axes.map((_, i) => {
          const [x, y] = pointAt(i, 100);
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y} />;
        })}
      </g>

      {/* Interview-ready threshold ring (dashed) */}
      {targetPoly && (
        <polygon points={targetPoly} fill="rgba(139,92,246,0.08)" stroke="#8b5cf6" strokeWidth="1.5" strokeDasharray="4 4" />
      )}

      {/* Current profile */}
      <polygon points={currentPoly} fill="rgba(45,212,191,0.18)" stroke="#2dd4bf" strokeWidth="2" />
      {axes.map((ax, i) => {
        const [x, y] = pointAt(i, ax.value);
        const below = target != null && ax.value < target;
        return <circle key={i} cx={x} cy={y} r={Math.max(2.5, size * 0.011)} fill={below ? '#f43f5e' : '#2dd4bf'} />;
      })}

      {/* Axis labels */}
      {showLabels && (
        <g className="font-mono" fontSize={Math.max(9, size * 0.032)}>
          {axes.map((ax, i) => {
            const a = angleFor(i);
            const x = cx + labelR * Math.cos(a);
            const y = cy + labelR * Math.sin(a);
            const cos = Math.cos(a);
            const anchor = cos > 0.3 ? 'start' : cos < -0.3 ? 'end' : 'middle';
            const emph = emphasized?.has(ax.name);
            return (
              <text
                key={i}
                x={x}
                y={y}
                textAnchor={anchor}
                dominantBaseline="middle"
                fill={emph ? '#2dd4bf' : '#94a3b8'}
                fontWeight={emph ? 700 : 400}
              >
                {ax.name}
              </text>
            );
          })}
        </g>
      )}
    </svg>
  );
}
