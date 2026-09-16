import "server-only";
import { getJson, positive } from "@/lib/sources/shared";

/**
 * USD → CNY 汇率。除 goldapi 外的免费金价源都只给美元价，得自己补一段汇率。
 * 三个来源依次降级：Yahoo（分钟级）→ frankfurter（ECB 日频）→ open.er-api（日频）。
 */

const YAHOO = "https://query1.finance.yahoo.com/v8/finance/chart/CNY=X";

type YahooChart = {
  chart?: {
    result?: {
      meta?: { regularMarketPrice?: number };
      timestamp?: number[];
      indicators?: { quote?: { close?: (number | null)[] }[] };
    }[];
  };
};

// 汇率变动远慢于金价，成功取到后在内存里留一段时间；全部源都挂了还能拿它兜底。
let cached: { rate: number; at: number } | null = null;
const SOFT_TTL_MS = 30 * 60_000;

async function fromYahoo(ttl: number) {
  const data = await getJson<YahooChart>(`${YAHOO}?interval=1d&range=5d`, ttl);
  return data?.chart?.result?.[0]?.meta?.regularMarketPrice;
}

async function fromFrankfurter(ttl: number) {
  const data = await getJson<{ rates?: Record<string, number> }>(
    "https://api.frankfurter.app/latest?from=USD&to=CNY",
    ttl,
  );
  return data?.rates?.CNY;
}

async function fromErApi(ttl: number) {
  const data = await getJson<{ rates?: Record<string, number> }>(
    "https://open.er-api.com/v6/latest/USD",
    ttl,
  );
  return data?.rates?.CNY;
}

export async function usdToCny(ttl: number): Promise<number | null> {
  if (cached && Date.now() - cached.at < SOFT_TTL_MS) return cached.rate;

  for (const load of [fromYahoo, fromFrankfurter, fromErApi]) {
    try {
      const rate = await load(ttl);
      if (positive(rate)) {
        cached = { rate, at: Date.now() };
        return rate;
      }
    } catch {
      // 换下一个源。
    }
  }

  if (cached) {
    console.warn("[gold] 汇率源全部取不到，沿用上一次的 USD/CNY");
    return cached.rate;
  }
  return null;
}

/**
 * 最近一段时间每日的 USD/CNY，键是 UTC 日期。
 * 用来给历史金价配当天的汇率；汇率日内波动很小，取不到某天就由调用方回退到最新汇率。
 */
export async function usdCnyDaily(): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  try {
    const data = await getJson<YahooChart>(`${YAHOO}?interval=1d&range=3mo`, 6 * 3600);
    const result = data?.chart?.result?.[0];
    const stamps = result?.timestamp ?? [];
    const closes = result?.indicators?.quote?.[0]?.close ?? [];
    stamps.forEach((ts, i) => {
      const close = closes[i];
      if (positive(close)) map.set(new Date(ts * 1000).toISOString().slice(0, 10), close);
    });
  } catch {
    // 没有历史汇率也能跑，调用方会退回最新汇率。
  }
  return map;
}
