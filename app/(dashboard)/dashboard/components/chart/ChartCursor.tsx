import type { Coordinate } from "recharts";

/**
 * Hover marker: a hairline dropped through the plot with a solid caret sitting
 * just above it. Recharts clones this element with the cursor props, so the
 * plot rectangle arrives as top/height and the hovered column as `points`.
 */
type Props = {
  points?: ReadonlyArray<Coordinate>;
  top?: number;
  height?: number;
};

const CARET_HALF_WIDTH = 5;
const CARET_HEIGHT = 7;
const CARET_GAP = 2;

export default function ChartCursor({ points, top = 0, height = 0 }: Props) {
  const x = points?.[0]?.x;
  if (x == null) return null;

  const caretBottom = top - CARET_GAP;
  const caretTop = caretBottom - CARET_HEIGHT;

  return (
    <g pointerEvents="none">
      <line
        x1={x}
        x2={x}
        y1={top}
        y2={top + height}
        stroke="var(--color-ink-3)"
        strokeWidth={1}
        strokeDasharray="2 3"
      />
      <path
        d={`M ${x - CARET_HALF_WIDTH} ${caretTop} L ${x + CARET_HALF_WIDTH} ${caretTop} L ${x} ${caretBottom} Z`}
        fill="var(--color-ink)"
      />
    </g>
  );
}
