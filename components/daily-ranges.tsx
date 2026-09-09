"use client";

import type { DailyRange, GoldQuote } from "@/lib/types";
import { clamp, dayCN, money } from "@/lib/format";

type Row = DailyRange & { label: string; today: boolean };

export function DailyRanges({ days, quote }: { days: DailyRange[]; quote: GoldQuote }) {
  if (days.length === 0) return null;

  const rows: Row[] = [
    ...days.map((d) => ({ ...d, label: dayCN(d.date), today: false })),
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
  const span = ceiling - floor;
  const pos = (value: number) => (span > 0 ? clamp(((value - floor) / span) * 100, 0, 100) : 50);

  return (
    <section className="border-b border-line py-14 md:py-20">
      <div className="mx-auto w-full max-w-[1400px] px-5 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
          <div>
            <h2 className="text-xl font-medium tracking-tight md:text-2xl">每日区间</h2>
            <p className="mt-3 max-w-[52ch] text-sm leading-relaxed text-muted">
              最近 {days.length} 个交易日的克价高低区间，竖线是当日收盘价。周末休市不计入。
            </p>
          </div>
          <div className="num text-sm text-muted">
            区间 {money(floor)} – {money(ceiling)} 元/克
          </div>
        </div>

        <ul className="mt-10 md:mt-12">
          {rows.map((row) => (
            <li
              key={row.date}
              className="grid grid-cols-[3.25rem_1fr] items-center gap-x-4 gap-y-3 border-t border-line py-4 md:grid-cols-[4.5rem_1fr_12rem]"
            >
              <span
                className={`num col-start-1 row-start-1 text-sm ${row.today ? "text-fg" : "text-muted"}`}
              >
                {row.label}
              </span>

              <div className="relative col-span-2 col-start-1 row-start-2 h-3 md:col-span-1 md:col-start-2 md:row-start-1">
                <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-line" />
                <div
                  className={`absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full ${
                    row.today ? "bg-accent" : "bg-line-strong"
                  }`}
                  style={{
                    left: `${pos(row.lowGram)}%`,
                    width: `${Math.max(pos(row.highGram) - pos(row.lowGram), 0.6)}%`,
                  }}
                />
                <span
                  className="absolute top-1/2 h-3 w-[2px] -translate-x-1/2 -translate-y-1/2 bg-fg"
                  style={{ left: `${pos(row.closeGram)}%` }}
                />
              </div>

              <div className="num col-start-2 row-start-1 flex items-baseline justify-end gap-2 text-sm md:col-start-3">
                <span className={row.today ? "" : "text-muted"}>
                  {money(row.lowGram)} – {money(row.highGram)}
                </span>
                <span className="text-muted">·</span>
                <span>{money(row.closeGram)}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
