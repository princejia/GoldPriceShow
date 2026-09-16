import "server-only";
import type { DailyRange, GoldQuote } from "@/lib/types";
import { usdCnyDaily, usdToCny } from "@/lib/sources/fx";
import { buildQuote, getJson, positive, quoteTtl, toGram, type GoldSource } from "@/lib/sources/shared";

/**
 * Yahoo Finance 的公开图表接口，免费且不用 key。
 * 标的是 COMEX 黄金期货主力连续（GC=F）：相对伦敦现货带一点升水，
 * 但它是这几个免费源里唯一同时给出完整 OHLC 和日线历史的。
 */
const CHART = "https://query1.finance.yahoo.com/v8/finance/chart/GC%3DF?interval=1d&range=3mo";

type Chart = {
  chart?: {
    result?: {
      meta?: {
        regularMarketPrice?: number;
        regularMarketDayHigh?: number;
        regularMarketDayLow?: number;
        regularMarketTime?: number;
      };
      timestamp?: number[];
      indicators?: {
        quote?: {
          open?: (number | null)[];
          high?: (number | null)[];
          low?: (number | null)[];
          close?: (number | null)[];
        }[];
      };
    }[];
  };
};

type Row = { ts: number; open?: number; high?: number; low?: number; close: number };

// 期货的交易日跨自然日，按交易所所在时区打标签才不会串行。
const exchangeDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const sessionDay = (ms: number) => exchangeDay.format(new Date(ms));

const utcDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

const pick = (list: (number | null)[] | undefined, i: number) => {
  const value = list?.[i];
  return positive(value) ? value : undefined;
};

/** 日线用同一个 URL 和 TTL 取，行情和历史两处调用会命中同一份 Next 缓存。 */
async function load(ttl: number) {
  const result = (await getJson<Chart>(CHART, ttl))?.chart?.result?.[0];
  if (!result) return null;

  const quotes = result.indicators?.quote?.[0];
  const rows: Row[] = [];
  (result.timestamp ?? []).forEach((ts, i) => {
    const close = pick(quotes?.close, i);
    if (close === undefined) return;
    rows.push({
      ts: ts * 1000,
      open: pick(quotes?.open, i),
      high: pick(quotes?.high, i),
      low: pick(quotes?.low, i),
      close,
    });
  });

  return { meta: result.meta ?? {}, rows };
}

export const yahoo: GoldSource = {
  id: "yahoo",

  available: () => true,

  async quote(ttl): Promise<GoldQuote | null> {
    const [data, rate] = await Promise.all([load(ttl), usdToCny(ttl)]);
    if (!data || !positive(rate)) return null;

    const { meta, rows } = data;
    const current = rows[rows.length - 1];
    const usd = positive(meta.regularMarketPrice) ? meta.regularMarketPrice : current?.close;
    if (!positive(usd)) return null;

    const cny = (value?: number) => (positive(value) ? value * rate : undefined);

    return buildQuote({
      ounce: usd * rate,
      open: cny(current?.open),
      prevClose: cny(rows[rows.length - 2]?.close),
      low: cny(meta.regularMarketDayLow ?? current?.low),
      high: cny(meta.regularMarketDayHigh ?? current?.high),
      timestamp: (meta.regularMarketTime ?? Math.floor(Date.now() / 1000)) * 1000,
    });
  },

  async history(limit): Promise<DailyRange[]> {
    const ttl = quoteTtl();
    const [data, rate, daily] = await Promise.all([load(ttl), usdToCny(ttl), usdCnyDaily()]);
    if (!data || !positive(rate)) return [];

    // 当前这根日线对应的是进行中的交易日，页面自己会用实时价补上「今日」，这里排掉免得重复。
    const live = sessionDay(
      positive(data.meta.regularMarketTime) ? data.meta.regularMarketTime * 1000 : Date.now(),
    );

    return data.rows
      .filter((row) => sessionDay(row.ts) < live)
      .slice(-limit)
      .map((row) => {
        const fx = daily.get(utcDay(row.ts)) ?? rate;
        const low = (row.low ?? Math.min(row.open ?? row.close, row.close)) * fx;
        const high = (row.high ?? Math.max(row.open ?? row.close, row.close)) * fx;
        return {
          date: sessionDay(row.ts),
          lowGram: toGram(Math.min(low, high)),
          highGram: toGram(Math.max(low, high)),
          closeGram: toGram(row.close * fx),
        };
      });
  },
};
