import "server-only";
import type { DailyHistory, DailyRange, GoldQuote, Karat, QuoteResult } from "@/lib/types";

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

// 主用 GOLDAPI_KEY，撞上额度后自动换 GOLDAPI_KEY_BACKUP。
const KEY_ENVS = ["GOLDAPI_KEY", "GOLDAPI_KEY_BACKUP"] as const;
// 401/403/429 基本就是该 key 的月度额度用尽或被禁，短时间再试只是白烧请求。
const QUOTA_COOLDOWN_MS = 6 * 60 * 60_000;

let keyPool: { key: string; pausedUntil: number }[] | null = null;

function keys() {
  if (!keyPool) {
    const seen = new Set<string>();
    keyPool = [];
    for (const name of KEY_ENVS) {
      const key = process.env[name]?.trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      keyPool.push({ key, pausedUntil: 0 });
    }
  }
  return keyPool;
}

type Attempt = { res: Response } | { failure: "missing_key" | "upstream" };

/** 依次拿可用的 key 打上游；某个 key 撞上额度/鉴权错误就冷却它并换下一个。网络异常直接抛出。 */
async function goldFetch(url: string, revalidate: number | false): Promise<Attempt> {
  const pool = keys();
  if (pool.length === 0) return { failure: "missing_key" };

  let tried = 0;
  for (const slot of pool) {
    if (Date.now() < slot.pausedUntil) continue;
    tried += 1;

    const res = await fetch(url, {
      headers: { "x-access-token": slot.key, "Content-Type": "application/json" },
      next: { revalidate },
    });
    if (res.ok) return { res };
    if (res.status === 401 || res.status === 403 || res.status === 429) {
      slot.pausedUntil = Date.now() + QUOTA_COOLDOWN_MS;
      console.warn(`[gold] key 已不可用（HTTP ${res.status}），冷却 6 小时后再试`);
      continue;
    }
    return { res };
  }

  if (tried === 0) console.warn("[gold] 所有 key 都在冷却中，本次不打上游");
  return { failure: "upstream" };
}

export async function fetchGoldQuote(): Promise<QuoteResult> {
  const ttl = Number.parseInt(process.env.GOLD_TTL_SECONDS ?? "600", 10);

  let raw: RawQuote;
  try {
    // Next 数据缓存：这里决定了真正打到 goldapi 的频率，与页面轮询频率解耦。
    const attempt = await goldFetch(ENDPOINT, Number.isFinite(ttl) && ttl > 0 ? ttl : 600);
    if ("failure" in attempt) return fallback(attempt.failure);
    if (!attempt.res.ok) return fallback("upstream");
    raw = (await attempt.res.json()) as RawQuote;
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
// 上游报错后的冷却，避免每次渲染都去撞墙。
let historyPausedUntil = 0;
const COOLDOWN_MS = 15 * 60_000;
// 一次渲染最多现取几天，剩下的等后续请求慢慢补，免得冷启动一下子把配额打光。
const MAX_NEW_DAYS = 2;

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
 * 逐天串行取数，并在上游出错或当次新取达到上限时提前收手。
 */
export async function fetchDailyRanges(): Promise<DailyHistory> {
  const limit = Number.parseInt(process.env.GOLD_HISTORY_DAYS ?? "7", 10);
  if (keys().length === 0 || !Number.isFinite(limit) || limit <= 0) {
    return { days: [], reason: "off" };
  }

  const days: DailyRange[] = [];
  let fetched = 0;

  for (let back = 1; back <= limit * 2 + 4 && days.length < limit; back += 1) {
    const iso = shanghaiDay(back);
    if (isWeekend(iso)) continue;

    const cached = historyCache.get(iso);
    if (cached) {
      days.push(cached);
      continue;
    }
    if (fetched >= MAX_NEW_DAYS || Date.now() < historyPausedUntil) break;

    try {
      fetched += 1;
      const attempt = await goldFetch(`${HISTORY_ENDPOINT}/${iso.replaceAll("-", "")}`, false);
      if ("failure" in attempt) {
        console.warn(`[gold] 历史行情 ${iso} 没有可用的 key`);
        historyPausedUntil = Date.now() + COOLDOWN_MS;
        break;
      }
      const res = attempt.res;
      if (!res.ok) {
        console.warn(`[gold] 历史行情 ${iso} 取数失败：HTTP ${res.status}`);
        historyPausedUntil =
          Date.now() + (res.status === 403 || res.status === 429 ? QUOTA_COOLDOWN_MS : COOLDOWN_MS);
        break;
      }
      const day = normalizeDay(iso, (await res.json()) as RawQuote);
      if (!day) continue;
      historyCache.set(iso, day);
      days.push(day);
    } catch (error) {
      console.warn(`[gold] 历史行情 ${iso} 取数异常：`, error);
      historyPausedUntil = Date.now() + COOLDOWN_MS;
      break;
    }
  }

  return days.length > 0 ? { days: days.reverse() } : { days, reason: "unavailable" };
}
