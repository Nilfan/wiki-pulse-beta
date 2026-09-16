type Props = {
  values: readonly number[];
  color?: string;
};

const WIDTH = 64;
const HEIGHT = 20;
/** Keeps a flat or peaking line from being sliced by the viewBox edge. */
const PADDING = 1.5;

/**
 * Trend only — no axes, no hover. The exact figure sits next to it, so the
 * line is scaled to its own min/max to make the shape readable.
 */
export default function Sparkline({ values, color = "#a82838" }: Props) {
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const stepX = WIDTH / (values.length - 1);

  const points = values
    .map((value, index) => {
      const x = index * stepX;
      const y =
        max === min
          ? HEIGHT / 2
          : PADDING + (1 - (value - min) / span) * (HEIGHT - PADDING * 2);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      className="h-5 w-16 shrink-0 overflow-visible"
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.2}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
