"use client";

import type { GoldQuote } from "@/lib/types";
import { bandPath, linePath, type Point } from "@/lib/chart";
import { clockCN, money } from "@/lib/format";

export type Tick = { t: number; gram: number };

const W = 600;
const H = 170;
const PAD = 8;
const X_PAD = 6;

/** 纵轴固定为当日高低区间，折线因此始终落在「日内区间」的上下文里。 */
export function IntradayChart({ quote, ticks }: { quote: GoldQuote; ticks: Tick[] }) {
  const series = [quote.openGram, ...ticks.map((tick) => tick.gram)];
  const floor = Math.min(quote.lowGram, ...series);
  const ceiling = Math.max(quote.highGram, ...series);
  const span = ceiling - floor || Math.max(quote.gram * 0.001, 0.01);

  const x = (i: number) =>
    series.length < 2 ? W - X_PAD : X_PAD + (i / (series.length - 1)) * (W - X_PAD * 2);
  const y = (value: number) => PAD + (1 - (value - floor) / span) * (H - PAD * 2);

  const points: Point[] = series.map((value, i) => ({ x: x(i), y: y(value) }));
  const last = points[points.length - 1];
  const up = quote.changePercent >= 0;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible" role="presentation">
        <line x1="0" y1={y(ceiling)} x2={W} y2={y(ceiling)} className="stroke-line" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <line x1="0" y1={y(floor)} x2={W} y2={y(floor)} className="stroke-line" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <line
          x1="0"
          y1={y(quote.openGram)}
          x2={W}
          y2={y(quote.openGram)}
          className="stroke-line-strong"
          strokeWidth="1"
          strokeDasharray="3 4"
          vectorEffect="non-scaling-stroke"
        />

        <g className={up ? "text-up" : "text-down"}>
          {points.length > 1 ? (
            <path
              d={bandPath(points, [
                { x: X_PAD, y: y(floor) },
                { x: last.x, y: y(floor) },
              ])}
              fill="currentColor"
              opacity="0.1"
            />
          ) : null}
          <path
            d={points.length > 1 ? linePath(points) : `M${X_PAD} ${last.y} L${W - X_PAD} ${last.y}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          <circle cx={last.x} cy={last.y} r="4" fill="currentColor" />
        </g>
      </svg>

      <div className="mt-2 flex items-baseline justify-between text-xs text-muted">
        <span>开盘 {money(quote.openGram)}</span>
        <span className="num">
          {ticks.length > 1 ? `${ticks.length} 次采样 · ` : ""}
          {clockCN(ticks[ticks.length - 1]?.t ?? quote.timestamp)}
        </span>
      </div>
    </div>
  );
}
