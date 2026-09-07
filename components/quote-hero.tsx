"use client";

import type { CSSProperties } from "react";
import { ArrowsClockwise, TrendDown, TrendUp, WarningCircle } from "@phosphor-icons/react";
import type { GoldQuote } from "@/lib/types";
import { clamp, clockCN, money, signedMoney, signedPercent } from "@/lib/format";

const delay = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

type Props = {
  quote: GoldQuote;
  fetchedAt: number | null;
  stale: boolean;
  refreshing: boolean;
  flash: "up" | "down" | null;
  onRefresh: () => void;
};

export function QuoteHero({ quote, fetchedAt, stale, refreshing, flash, onRefresh }: Props) {
  const up = quote.changePercent >= 0;
  const tone = up ? "text-up" : "text-down";
  const span = quote.highGram - quote.lowGram;
  const position = span > 0 ? clamp(((quote.gram - quote.lowGram) / span) * 100, 0, 100) : 50;
  const spanPercent = quote.lowGram > 0 ? (span / quote.lowGram) * 100 : 0;

  return (
    <section className="border-b border-line">
      <div className="mx-auto w-full max-w-[1400px] px-5 md:px-8">
        <div className="grid min-h-[calc(100dvh-4rem)] grid-cols-1 items-center gap-10 pb-14 pt-10 md:grid-cols-12 md:gap-10 md:pb-16 md:pt-16 lg:gap-16">
          <div className="md:col-span-7">
            <h1 className="rise text-[24px] font-medium tracking-tight md:text-[30px]" style={delay(0)}>
              现货黄金 · 人民币
            </h1>

            <div
              className="rise mt-5 flex flex-wrap items-baseline gap-x-4 gap-y-2 md:mt-6"
              style={delay(70)}
            >
              <span
                key={`${quote.gram}-${flash}`}
                className={flash ? `flash-${flash} -mx-2 px-2` : "-mx-2 px-2"}
              >
                <span
                  aria-live="polite"
                  className="num block text-[clamp(3.25rem,9vw,6rem)] font-medium leading-[0.92] tracking-tight"
                >
                  {money(quote.gram)}
                </span>
              </span>
              <span className="text-base text-muted">元 / 克 · 24K</span>
            </div>

            <div className="rise mt-5 flex flex-wrap items-center gap-3" style={delay(140)}>
              <span
                className={`num inline-flex items-center gap-1.5 rounded-sm bg-current/10 px-2.5 py-1 text-sm font-medium ${tone}`}
              >
                {up ? <TrendUp size={15} weight="bold" /> : <TrendDown size={15} weight="bold" />}
                {signedPercent(quote.changePercent)}
              </span>
              <span className={`num text-sm ${tone}`}>{signedMoney(quote.changeGram)} 元/克</span>
            </div>

            <div className="rise mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 md:mt-10" style={delay(210)}>
              <button
                type="button"
                onClick={onRefresh}
                disabled={refreshing}
                className="tactile inline-flex items-center gap-2 rounded-sm bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-55"
              >
                <ArrowsClockwise
                  size={16}
                  weight="bold"
                  className={refreshing ? "motion-safe:animate-spin" : ""}
                />
                {refreshing ? "读取中" : "刷新"}
              </button>

              {stale ? (
                <span className="inline-flex items-center gap-1.5 text-sm text-muted">
                  <WarningCircle size={15} weight="regular" />
                  上游暂时取不到，显示的是最近一次报价
                </span>
              ) : (
                <span className="num text-sm text-muted">
                  更新于 {clockCN(fetchedAt ?? quote.timestamp)}
                </span>
              )}
            </div>
          </div>

          <div className="rise md:col-span-5" style={delay(280)}>
            <div className="rounded-md border border-line bg-surface p-5 md:p-6">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-sm text-muted">日内区间</span>
                <span className="num text-sm">振幅 {spanPercent.toFixed(2)}%</span>
              </div>

              <div className="relative mt-5 h-3">
                <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-line-strong" />
                <div className="absolute left-0 top-1/2 h-2.5 w-px -translate-y-1/2 bg-line-strong" />
                <div className="absolute right-0 top-1/2 h-2.5 w-px -translate-y-1/2 bg-line-strong" />
                <span
                  className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-fg"
                  style={{ left: `${position}%` }}
                />
              </div>

              <div className="mt-2.5 flex items-baseline justify-between">
                <span className="num text-sm">{money(quote.lowGram)}</span>
                <span className="num text-sm">{money(quote.highGram)}</span>
              </div>

              <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-line pt-5">
                <Field term="昨收" value={money(quote.prevCloseGram)} />
                <Field term="价差" value={money(quote.spreadGram, 3)} />
                <Field term="买入" value={money(quote.bidGram)} />
                <Field term="卖出" value={money(quote.askGram)} />
              </dl>

              <div className="mt-5 flex items-baseline justify-between gap-4 border-t border-line pt-4">
                <span className="text-sm text-muted">每盎司</span>
                <span className="num text-base">¥ {money(quote.ounce)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Field({ term, value }: { term: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-muted">{term}</dt>
      <dd className="num mt-1 text-[18px] tracking-tight">{value}</dd>
    </div>
  );
}
