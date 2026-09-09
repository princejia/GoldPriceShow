export type Point = { x: number; y: number };

const d = (p: Point) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`;

/** 折线的 path。 */
export const linePath = (points: Point[]) =>
  points.map((p, i) => `${i === 0 ? "M" : "L"}${d(p)}`).join(" ");

/** 上下两条边界围成的封闭区域，用来画高低带或折线下方的填充。 */
export const bandPath = (top: Point[], bottom: Point[]) =>
  `${linePath(top)} ${bottom
    .slice()
    .reverse()
    .map((p) => `L${d(p)}`)
    .join(" ")} Z`;
