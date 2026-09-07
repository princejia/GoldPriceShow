"use client";

import type { GoldQuote } from "@/lib/types";
import { money } from "@/lib/format";

export function UnitStrip({ quote }: { quote: GoldQuote }) {
  const units = [
    { label: "每钱", note: "3.78 克", value: money(quote.gram * 3.77994) },
    { label: "每两", note: "37.80 克", value: money(quote.tael) },
    { label: "每盎司", note: "31.10 克", value: money(quote.ounce) },
    { label: "每公斤", note: "1000 克", value: money(quote.kilogram, 0) },
  ];

  return (
    <section className="border-b border-line py-14 md:py-20">
      <div className="mx-auto w-full max-w-[1400px] px-5 md:px-8">
        <h2 className="text-xl font-medium tracking-tight md:text-2xl">按重量单位折算</h2>
        <p className="mt-3 max-w-[52ch] text-sm leading-relaxed text-muted">
          同一份 24K 金价，换成国内外常用的四种计重单位。
        </p>

        <div className="mt-10 grid grid-cols-2 gap-x-8 gap-y-10 md:mt-12 md:grid-cols-4 md:gap-x-0">
          {units.map((unit, i) => (
            <div
              key={unit.label}
              className={[
                "md:border-l md:border-line md:px-8",
                i === 0 ? "md:border-l-0 md:pl-0" : "",
                i === units.length - 1 ? "md:pr-0" : "",
              ].join(" ")}
            >
              <div className="flex items-baseline gap-2">
                <span className="text-sm text-muted">{unit.label}</span>
                <span className="num text-xs text-muted">{unit.note}</span>
              </div>
              <div className="num mt-2.5 text-[26px] tracking-tight md:text-[30px]">
                {unit.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
