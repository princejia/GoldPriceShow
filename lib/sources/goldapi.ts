import "server-only";
import type { DailyRange, GoldQuote } from "@/lib/types";
import {
  buildQuote,
  isWeekend,
  shanghaiDayBack,
  toGram,
  type GoldSource,
} from "@/lib/sources/shared";

const ENDPOINT = "https://www.goldapi.io/api/price/XAU/CNY";
const HISTORY_ENDPOINT = "https://www.goldapi.io/api/XAU/CNY";

type RawQuote = {
  price?: number;
  open_price?: number;
  prev_close_price?: number;
  low_price?: number;
  high_price?: number;
  ask?: number;
  bid?: number;
  timestamp?: number;
  price_per_unit?: Record<string, number>;
  melt_price_per_gram?: Record<string, number>;
};

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

/** 依次拿可用的 key 打上游；某个 key 撞上额度/鉴权错误就冷却它并换下一个。网络异常直接抛出。 */
async function goldFetch(url: string, revalidate: number | false): Promise<Response | null> {
  let tried = 0;
  for (const slot of keys()) {
    if (Date.now() < slot.pausedUntil) continue;
    tried += 1;

    const res = await fetch(url, {
      headers: { "x-access-token": slot.key, "Content-Type": "application/json" },
      next: { revalidate },
    });
    if (res.ok) return res;
    if (res.status === 401 || res.status === 403 || res.status === 429) {
      slot.pausedUntil = Date.now() + QUOTA_COOLDOWN_MS;
      console.warn(`[gold] goldapi key 已不可用（HTTP ${res.status}），冷却 6 小时后再试`);
      continue;
    }
    console.warn(`[gold] goldapi 取数失败：HTTP ${res.status}`);
    return null;
  }

  if (tried === 0) console.warn("[gold] goldapi 所有 key 都在冷却中，本次不打上游");
  return null;
}

// 历史行情不会再变，成功过的日期直接常驻内存，不再打上游。
const historyCache = new Map<string, DailyRange>();
// 上游报错后的冷却，避免每次渲染都去撞墙。
let historyPausedUntil = 0;
const COOLDOWN_MS = 15 * 60_000;
// 一次渲染最多现取几天，剩下的等后续请求慢慢补，免得冷启动一下子把配额打光。
const MAX_NEW_DAYS = 2;

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

export const goldapi: GoldSource = {
  id: "goldapi",

  available: () => keys().length > 0,

  async quote(ttl): Promise<GoldQuote | null> {
    const res = await goldFetch(ENDPOINT, ttl);
    if (!res) return null;

    const raw = (await res.json()) as RawQuote;
    const perUnit = raw.price_per_unit ?? {};

    return buildQuote(
      {
        ounce: raw.price ?? 0,
        open: raw.open_price,
        prevClose: raw.prev_close_price,
        low: raw.low_price,
        high: raw.high_price,
        ask: raw.ask,
        bid: raw.bid,
        timestamp: (raw.timestamp ?? Math.floor(Date.now() / 1000)) * 1000,
      },
      {
        gram: perUnit.gram,
        kilogram: perUnit.kilogram,
        tael: perUnit.tael,
        melt: raw.melt_price_per_gram,
      },
    );
  },

  /** goldapi 的历史接口一天一个请求，所以逐天串行取并严格限流。 */
  async history(limit): Promise<DailyRange[]> {
    const days: DailyRange[] = [];
    let fetched = 0;

    for (let back = 1; back <= limit * 2 + 4 && days.length < limit; back += 1) {
      const iso = shanghaiDayBack(back);
      if (isWeekend(iso)) continue;

      const cached = historyCache.get(iso);
      if (cached) {
        days.push(cached);
        continue;
      }
      if (fetched >= MAX_NEW_DAYS || Date.now() < historyPausedUntil) break;

      fetched += 1;
      const res = await goldFetch(`${HISTORY_ENDPOINT}/${iso.replaceAll("-", "")}`, false);
      if (!res) {
        historyPausedUntil = Date.now() + COOLDOWN_MS;
        break;
      }
      const day = normalizeDay(iso, (await res.json()) as RawQuote);
      if (!day) continue;
      historyCache.set(iso, day);
      days.push(day);
    }

    return days.reverse();
  },
};
