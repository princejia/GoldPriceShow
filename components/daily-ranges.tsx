"use client";

import { useState } from "react";
import type { DailyHistory, DailyRange, GoldQuote } from "@/lib/types";
import { linePath, type Point } from "@/lib/chart";
import { clamp, dayCN, money } from "@/lib/format";

const W = 600;
const H = 200;
const PAD = 12;
const X_PAD = 6;

type Row = DailyRange & { label: string; today: boolean };

export function DailyRanges({ history, quote }: { history: DailyHistory; quote: GoldQuote }) {
  const [hover, setHover] = useState<number | null>(null);

  const days = history.days;
  if (history.reason === "off") return null;
  if (days.length === 0) return <Unavailable />;

  const rows: Row[] = [
    ...days.map((day) => ({ ...day, label: dayCN(day.date), today: false })),
    {
      date: "today",
      lowGram: Math.min(quote.lowGram, quote.gram),
      highGram: Math.max(quote.highGram, quote.gram),
      closeGram: quote.gram,
      label: "今日",
      today: true,
    },
  ];

  const floor = Math.min(...rows.map((r) => r.lowGram));
  const ceiling = Math.max(...rows.map((r) => r.highGram));
  const span = ceiling - floor || 1;

  const x = (i: number) =>
    rows.length < 2 ? W / 2 : X_PAD + (i / (rows.length - 1)) * (W - X_PAD * 2);
  const y = (value: number) => PAD + (1 - (value - floor) / span) * (H - PAD * 2);

  const tops: Point[] = rows.map((r, i) => ({ x: x(i), y: y(r.highGram) }));
  const bottoms: Point[] = rows.map((r, i) => ({ x: x(i), y: y(r.lowGram) }));
  const closes: Point[] = rows.map((r, i) => ({ x: x(i), y: y(r.closeGram) }));

  const active = hover ?? rows.length - 1;
  const picked = rows[active];
  const pickedSpan = picked.highGram - picked.lowGram;

  const track = (clientX: number, element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
    setHover(Math.round(ratio * (rows.length - 1)));
  };

  return (
    <section className="border-b border-line py-14 md:py-20">
      <div className="mx-auto w-full max-w-[1400px] px-5 md:px-8">
        <h2 className="text-xl font-medium tracking-tight md:text-2xl">每日走势</h2>
        <p className="mt-3 max-w-[52ch] text-sm leading-relaxed text-muted">
          最近 {days.length} 个交易日的克价收盘折线，周末休市不计入。上游历史接口只给收盘价，
          有高低区间的日子（如今日）额外画一根竖线。
        </p>

        <div className="mt-8 flex flex-wrap items-baseline gap-x-8 gap-y-2 md:mt-10">
          <span className={`text-sm ${picked.today ? "text-fg" : "text-muted"}`}>{picked.label}</span>
          {pickedSpan > 0 ? (
            <span className="num text-sm">
              <span className="text-muted">区间 </span>
              {money(picked.lowGram)} – {money(picked.highGram)}
            </span>
          ) : null}
          <span className="num text-sm">
            <span className="text-muted">{picked.today ? "现价 " : "收盘 "}</span>
            {money(picked.closeGram)}
          </span>
        </div>

        <div
          className="mt-5 touch-pan-y"
          onPointerMove={(event) => track(event.clientX, event.currentTarget)}
          onPointerLeave={() => setHover(null)}
        >
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible" role="presentation">
            {hover !== null ? (
              <line
                x1={x(active)}
                y1="0"
                x2={x(active)}
                y2={H}
                className="stroke-line-strong"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            ) : null}            {rows.map((row, i) =>
              row.highGram > row.lowGram ? (
                <line
                  key={`w-${row.date}`}
                  x1={tops[i].x}
                  y1={tops[i].y}
                  x2={bottoms[i].x}
                  y2={bottoms[i].y}
                  className={row.today ? "stroke-accent" : "stroke-line-strong"}
                  strokeWidth="6"
                  strokeLinecap="round"
                  opacity="0.35"
                  vectorEffect="non-scaling-stroke"
                />
              ) : null,
            )}
            <path
              d={linePath(closes)}
              fill="none"
              className="stroke-fg"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            {closes.map((point, i) => (
              <circle
                key={rows[i].date}
                cx={point.x}
                cy={point.y}
                r={i === active ? 5 : 3}
                className={rows[i].today ? "fill-accent" : "fill-fg"}
              />
            ))}
          </svg>

          <div className="mt-3 flex justify-between text-xs">
            {rows.map((row, i) => (
              <span key={row.date} className={`num ${i === active ? "text-fg" : "text-muted"}`}>
                {row.label}
              </span>
            ))}
          </div>
        </div>

        <div className="num mt-6 flex items-baseline justify-between border-t border-line pt-4 text-sm text-muted">
          <span>期间最低 {money(floor)}</span>
          <span>期间最高 {money(ceiling)}</span>
        </div>
      </div>
    </section>
  );
}

function Unavailable() {
  return (
    <section className="border-b border-line py-14 md:py-20">
      <div className="mx-auto w-full max-w-[1400px] px-5 md:px-8">
        <h2 className="text-xl font-medium tracking-tight md:text-2xl">每日走势</h2>
        <p className="mt-3 max-w-[52ch] text-sm leading-relaxed text-muted">
          历史行情暂时取不到，折线暂不显示。常见原因是 goldapi 的月度额度用尽（历史接口会直接返回 403），
          额度恢复后这里会自动出现。
        </p>
      </div>
    </section>
  );
}
