import "server-only";
import type { DailyRange, GoldQuote, Karat, QuoteResult } from "@/lib/types";

const ENDPOINT = "https://www.goldapi.io/api/price/XAU/CNY";
const HISTORY_ENDPOINT = "https://www.goldapi.io/api/XAU/CNY";
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

// 历史行情不会再变，成功过的日期直接常驻内存，不再打上游。
const historyCache = new Map<string, DailyRange>();
// 上游报错（多半是配额用尽）后的冷却，避免每次渲染都去撞墙。
let historyPausedUntil = 0;

const isoDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** 从今天往前数第 n 天在上海时区的 YYYY-MM-DD。 */
const shanghaiDay = (back: number) => isoDay.format(new Date(Date.now() - back * 86_400_000));

const isWeekend = (iso: string) => {
  const day = new Date(`${iso}T00:00:00Z`).getUTCDay();
  return day === 0 || day === 6;
};

function normalizeDay(iso: string, raw: RawQuote): DailyRange | null {
  const close = raw.price;
  if (typeof close !== "number" || !Number.isFinite(close) || close <= 0) return null;

  const open = raw.open_price ?? close;
  const low = raw.low_price ?? Math.min(open, close);
  const high = raw.high_price ?? Math.max(open, close);

  return {
    date: iso,
    lowGram: toGram(Math.min(low, high)),
    highGram: toGram(Math.max(low, high)),
    closeGram: toGram(close),
  };
}

/**
 * 最近若干个交易日的克价区间，按时间从早到晚。
 * 逐天串行取数并在遇到上游错误时提前收手，尽量少烧配额。
 */
export async function fetchDailyRanges(): Promise<DailyRange[]> {
  const key = process.env.GOLDAPI_KEY;
  const limit = Number.parseInt(process.env.GOLD_HISTORY_DAYS ?? "7", 10);
  if (!key || !Number.isFinite(limit) || limit <= 0) return [];

  const days: DailyRange[] = [];

  for (let back = 1; back <= limit * 2 + 4 && days.length < limit; back += 1) {
    const iso = shanghaiDay(back);
    if (isWeekend(iso)) continue;

    const cached = historyCache.get(iso);
    if (cached) {
      days.push(cached);
      continue;
    }
    if (Date.now() < historyPausedUntil) break;

    try {
      const res = await fetch(`${HISTORY_ENDPOINT}/${iso.replaceAll("-", "")}`, {
        headers: { "x-access-token": key, "Content-Type": "application/json" },
        next: { revalidate: false },
      });
      if (!res.ok) {
        historyPausedUntil = Date.now() + 15 * 60_000;
        break;
      }
      const day = normalizeDay(iso, (await res.json()) as RawQuote);
      if (!day) continue;
      historyCache.set(iso, day);
      days.push(day);
    } catch {
      historyPausedUntil = Date.now() + 15 * 60_000;
      break;
    }
  }

  return days.reverse();
}
