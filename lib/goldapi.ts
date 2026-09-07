import "server-only";
import type { GoldQuote, Karat, QuoteResult } from "@/lib/types";

const ENDPOINT = "https://www.goldapi.io/api/price/XAU/CNY";
const TROY_OUNCE_IN_GRAM = 31.1034768;

/** 展示用的成色。goldapi 返回 12 档，页面只保留国内外常见的 5 档。 */
const KARATS = ["22k", "21k", "18k", "14k", "10k"] as const;

type RawQuote = {
  price?: number;
  open_price?: number;
  prev_close_price?: number;
  low_price?: number;
  high_price?: number;
  change?: number;
  change_percent?: number;
  ask?: number;
  bid?: number;
  timestamp?: number;
  price_per_unit?: Record<string, number>;
  melt_price_per_gram?: Record<string, number>;
};

// 进程内兜底：上游限流或抖动时仍能渲染出上一次的行情。Vercel 上按实例存活，属尽力而为。
let lastGood: { quote: GoldQuote; fetchedAt: number } | null = null;

const toGram = (ouncePrice: number) => ouncePrice / TROY_OUNCE_IN_GRAM;

function normalize(raw: RawQuote): GoldQuote | null {
  const ounce = raw.price;
  if (typeof ounce !== "number" || !Number.isFinite(ounce) || ounce <= 0) return null;

  const perUnit = raw.price_per_unit ?? {};
  const melt = raw.melt_price_per_gram ?? {};
  const gram = perUnit.gram ?? toGram(ounce);
  const prevClose = raw.prev_close_price ?? ounce;
  const change = raw.change ?? ounce - prevClose;
  const ask = raw.ask ?? ounce;
  const bid = raw.bid ?? ounce;

  const karats: Karat[] = KARATS.map((k) => ({
    label: k.toUpperCase(),
    purity: (Number.parseInt(k, 10) / 24) * 100,
    gram: melt[k] ?? gram * (Number.parseInt(k, 10) / 24),
  })).filter((k) => Number.isFinite(k.gram) && k.gram > 0);

  return {
    ounce,
    gram,
    kilogram: perUnit.kilogram ?? gram * 1000,
    tael: perUnit.tael ?? gram * 37.7994,
    openPrice: raw.open_price ?? prevClose,
    prevClose,
    lowOunce: raw.low_price ?? ounce,
    highOunce: raw.high_price ?? ounce,
    lowGram: toGram(raw.low_price ?? ounce),
    highGram: toGram(raw.high_price ?? ounce),
    openGram: toGram(raw.open_price ?? prevClose),
    prevCloseGram: toGram(prevClose),
    change,
    changePercent: raw.change_percent ?? (prevClose ? (change / prevClose) * 100 : 0),
    changeGram: toGram(change),
    askGram: toGram(ask),
    bidGram: toGram(bid),
    spreadGram: toGram(Math.abs(ask - bid)),
    timestamp: (raw.timestamp ?? Math.floor(Date.now() / 1000)) * 1000,
    karats,
  };
}

function fallback(error: QuoteResult["error"]): QuoteResult {
  if (lastGood) {
    return { ok: true, quote: lastGood.quote, fetchedAt: lastGood.fetchedAt, stale: true, error };
  }
  return { ok: false, quote: null, fetchedAt: null, stale: true, error };
}

export async function fetchGoldQuote(): Promise<QuoteResult> {
  const key = process.env.GOLDAPI_KEY;
  if (!key) return fallback("missing_key");

  const ttl = Number.parseInt(process.env.GOLD_TTL_SECONDS ?? "600", 10);

  let raw: RawQuote;
  try {
    const res = await fetch(ENDPOINT, {
      headers: { "x-access-token": key, "Content-Type": "application/json" },
      // Next 数据缓存：这里决定了真正打到 goldapi 的频率，与页面轮询频率解耦。
      next: { revalidate: Number.isFinite(ttl) && ttl > 0 ? ttl : 600 },
    });
    if (!res.ok) return fallback("upstream");
    raw = (await res.json()) as RawQuote;
  } catch {
    return fallback("network");
  }

  const quote = normalize(raw);
  if (!quote) return fallback("payload");

  lastGood = { quote, fetchedAt: Date.now() };
  return { ok: true, quote, fetchedAt: lastGood.fetchedAt, stale: false };
}
