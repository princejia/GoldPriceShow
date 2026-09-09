"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DailyHistory, QuoteResult } from "@/lib/types";
import { Converter } from "@/components/converter";
import { DailyRanges } from "@/components/daily-ranges";
import type { Tick } from "@/components/intraday-chart";
import { KaratGrid } from "@/components/karat-grid";
import { QuoteError } from "@/components/quote-error";
import { QuoteHero } from "@/components/quote-hero";
import { UnitStrip } from "@/components/unit-strip";

const POLL_MS = 60_000;
// 日内折线只保留最近这么多个采样点。
const MAX_TICKS = 240;

export function QuoteBoard({ initial, history }: { initial: QuoteResult; history: DailyHistory }) {
  const [result, setResult] = useState<QuoteResult>(initial);
  const [refreshing, setRefreshing] = useState(false);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const [ticks, setTicks] = useState<Tick[]>(() =>
    initial.quote ? [{ t: initial.quote.timestamp, gram: initial.quote.gram }] : [],
  );
  const previousGram = useRef<number | null>(initial.quote?.gram ?? null);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await fetch("/api/quote", { cache: "no-store" });
      const next = (await response.json()) as QuoteResult;
      if (next.quote) {
        const before = previousGram.current;
        if (before !== null && next.quote.gram !== before) {
          setFlash(next.quote.gram > before ? "up" : "down");
        }
        previousGram.current = next.quote.gram;
        const tick: Tick = { t: next.quote.timestamp, gram: next.quote.gram };
        if (!next.stale) {
          // 服务端有缓存，反复刷新拿到的往往是同一份数据，不能往折线上叠点。
          setTicks((current) =>
            current[current.length - 1]?.t === tick.t ? current : [...current, tick].slice(-MAX_TICKS),
          );
        }
      }
      setResult(next);
    } catch {
      setResult((current) => ({
        ...current,
        ok: current.quote !== null,
        stale: true,
        error: "network",
      }));
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") void load();
    };
    const timer = window.setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [load]);

  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => setFlash(null), 1200);
    return () => window.clearTimeout(timer);
  }, [flash]);

  if (!result.quote) {
    return <QuoteError error={result.error} refreshing={refreshing} onRetry={load} />;
  }

  return (
    <>
      <QuoteHero
        quote={result.quote}
        fetchedAt={result.fetchedAt}
        stale={result.stale}
        refreshing={refreshing}
        flash={flash}
        ticks={ticks}
        onRefresh={load}
      />
      <DailyRanges history={history} quote={result.quote} />      <UnitStrip quote={result.quote} />
      <KaratGrid quote={result.quote} />
      <Converter quote={result.quote} />
    </>
  );
}
