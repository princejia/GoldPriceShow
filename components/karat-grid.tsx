"use client";

import type { GoldQuote } from "@/lib/types";
import { money } from "@/lib/format";

export function KaratGrid({ quote }: { quote: GoldQuote }) {
  const [featured, second, ...rest] = quote.karats;
  if (!featured || !second) return null;

  return (
    <section className="border-b border-line py-14 md:py-20">
      <div className="mx-auto w-full max-w-[1400px] px-5 md:px-8">
        <h2 className="text-xl font-medium tracking-tight md:text-2xl">各成色熔金价</h2>
        <p className="mt-3 max-w-[52ch] text-sm leading-relaxed text-muted">
          按含金量折算的纯金价值，不含回收折价与工费。
        </p>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 md:mt-12 md:grid-cols-12">
          <Tile karat={featured} size="lg" inverted className="md:col-span-6" />
          <Tile karat={second} size="lg" className="md:col-span-6" />
          {rest.map((karat) => (
            <Tile key={karat.label} karat={karat} size="sm" className="md:col-span-4" />
          ))}
        </div>
      </div>
    </section>
  );
}

function Tile({
  karat,
  size,
  inverted = false,
  className = "",
}: {
  karat: { label: string; purity: number; gram: number };
  size: "lg" | "sm";
  inverted?: boolean;
  className?: string;
}) {
  const surface = inverted
    ? "bg-accent text-accent-fg border-transparent"
    : "bg-surface text-fg border-line";
  const subdued = inverted ? "text-accent-fg/65" : "text-muted";

  return (
    <div className={`rounded-md border p-6 md:p-7 ${surface} ${className}`}>
      <div className="flex items-baseline justify-between gap-4">
        <span className="num text-lg font-medium tracking-tight">{karat.label}</span>
        <span className={`num text-sm ${subdued}`}>含金量 {karat.purity.toFixed(1)}%</span>
      </div>
      <div
        className={`num mt-8 tracking-tight ${
          size === "lg" ? "text-[38px] md:text-[46px]" : "text-[30px] md:text-[34px]"
        } leading-none`}
      >
        {money(karat.gram)}
      </div>
      <div className={`mt-2.5 text-sm ${subdued}`}>元 / 克</div>
    </div>
  );
}
