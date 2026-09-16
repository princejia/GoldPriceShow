import "server-only";
import type { GoldQuote } from "@/lib/types";
import { usdToCny } from "@/lib/sources/fx";
import { buildQuote, getJson, positive, type GoldSource } from "@/lib/sources/shared";

/**
 * Swissquote 的公开报价流，免费不用 key，给的是真正的现货金买卖价（XAU/USD）。
 * 只有当下这一笔报价，没有开盘/昨收/高低，所以涨跌和日内区间会是平的。
 */
const ENDPOINT = "https://forex-data-feed.swissquote.com/public-quotes/bboquotes/instrument/XAU/USD";

type Feed = {
  spreadProfilePrices?: { spreadProfile?: string; bid?: number; ask?: number }[];
  ts?: number;
}[];

export const swissquote: GoldSource = {
  id: "swissquote",

  available: () => true,

  async quote(ttl): Promise<GoldQuote | null> {
    const [feed, rate] = await Promise.all([getJson<Feed>(ENDPOINT, ttl), usdToCny(ttl)]);
    if (!feed?.length || !positive(rate)) return null;

    const book = feed[0];
    const prices =
      book.spreadProfilePrices?.find((p) => p.spreadProfile === "standard") ??
      book.spreadProfilePrices?.[0];
    const bid = prices?.bid;
    const ask = prices?.ask;
    if (!positive(bid) || !positive(ask)) return null;

    const mid = ((bid + ask) / 2) * rate;
    return buildQuote({
      ounce: mid,
      ask: ask * rate,
      bid: bid * rate,
      timestamp: positive(book.ts) ? book.ts : Date.now(),
    });
  },
};
