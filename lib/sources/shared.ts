import "server-only";
import type { DailyRange, GoldQuote, Karat, QuoteSourceId } from "@/lib/types";

export const TROY_OUNCE_IN_GRAM = 31.1034768;

export const toGram = (ouncePrice: number) => ouncePrice / TROY_OUNCE_IN_GRAM;

export const positive = (n: unknown): n is number =>
  typeof n === "number" && Number.isFinite(n) && n > 0;

/** 展示用的成色。页面只保留国内外常见的 5 档。 */
const KARATS = [22, 21, 18, 14, 10] as const;

/** 各行情源统一交出来的原料，全部是人民币计价的每盎司价格；缺的字段留空由 buildQuote 兜。 */
export type Spot = {
  ounce: number;
  open?: number;
  prevClose?: number;
  low?: number;
  high?: number;
  ask?: number;
  bid?: number;
  /** 毫秒时间戳。 */
  timestamp?: number;
};

/** 上游自己给了换算结果时用它的，避免和上游展示的数字对不上。 */
export type PerUnit = {
  gram?: number;
  kilogram?: number;
  tael?: number;
  melt?: Record<string, number>;
};

export type GoldSource = {
  id: QuoteSourceId;
  /** 缺必需凭据时返回 false，编排层直接跳过，不浪费一次请求。 */
  available: () => boolean;
  /** 取不到数据时返回 null；网络异常直接抛，由编排层归类。 */
  quote: (ttl: number) => Promise<GoldQuote | null>;
  /** 不支持历史行情的源不实现这个方法。 */
  history?: (limit: number) => Promise<DailyRange[]>;
};

export function buildQuote(spot: Spot, unit: PerUnit = {}): GoldQuote | null {
  const { ounce } = spot;
  if (!positive(ounce)) return null;

  const gram = unit.gram ?? toGram(ounce);
  const prevClose = positive(spot.prevClose) ? spot.prevClose : ounce;
  const open = positive(spot.open) ? spot.open : prevClose;
  const low = Math.min(positive(spot.low) ? spot.low : ounce, ounce);
  const high = Math.max(positive(spot.high) ? spot.high : ounce, ounce);
  const ask = positive(spot.ask) ? spot.ask : ounce;
  const bid = positive(spot.bid) ? spot.bid : ounce;
  const change = ounce - prevClose;
  const melt = unit.melt ?? {};

  const karats: Karat[] = KARATS.map((k) => ({
    label: `${k}K`,
    purity: (k / 24) * 100,
    gram: melt[`${k}k`] ?? gram * (k / 24),
  })).filter((k) => positive(k.gram));

  return {
    ounce,
    gram,
    kilogram: unit.kilogram ?? gram * 1000,
    tael: unit.tael ?? gram * 37.7994,
    openPrice: open,
    prevClose,
    lowOunce: low,
    highOunce: high,
    lowGram: toGram(low),
    highGram: toGram(high),
    openGram: toGram(open),
    prevCloseGram: toGram(prevClose),
    change,
    changePercent: prevClose ? (change / prevClose) * 100 : 0,
    changeGram: toGram(change),
    askGram: toGram(ask),
    bidGram: toGram(bid),
    spreadGram: toGram(Math.abs(ask - bid)),
    timestamp: spot.timestamp ?? Date.now(),
    karats,
  };
}

/** 向上游取数的最小间隔（秒），实际由 Next 的数据缓存执行。 */
export function quoteTtl() {
  const ttl = Number.parseInt(process.env.GOLD_TTL_SECONDS ?? "600", 10);
  return Number.isFinite(ttl) && ttl > 0 ? ttl : 600;
}

/** 免费接口大多会挡掉没有 UA 的请求。 */
export const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

/** 带 Next 数据缓存的 JSON GET。上游返回非 2xx 时给 null，网络异常照常抛出。 */
export async function getJson<T>(
  url: string,
  revalidate: number | false,
  headers: Record<string, string> = {},
): Promise<T | null> {
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": BROWSER_UA, ...headers },
    next: { revalidate },
  });
  if (!res.ok) return null;
  return (await res.json()) as T;
}

const isoDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** 毫秒时间戳在上海时区的 YYYY-MM-DD。 */
export const shanghaiDay = (at: number) => isoDay.format(new Date(at));

/** 从今天往前数第 n 天在上海时区的 YYYY-MM-DD。 */
export const shanghaiDayBack = (back: number) => shanghaiDay(Date.now() - back * 86_400_000);

export const isWeekend = (iso: string) => {
  const day = new Date(`${iso}T00:00:00Z`).getUTCDay();
  return day === 0 || day === 6;
};
