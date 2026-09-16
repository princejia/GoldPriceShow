import "server-only";
import type { GoldQuote } from "@/lib/types";
import { usdToCny } from "@/lib/sources/fx";
import { buildQuote, getJson, positive, type GoldSource } from "@/lib/sources/shared";

/**
 * gold-api.com，免费不用 key，返回现货金的美元价。
 * 字段最少（只有一个价格），当作最后一道兜底：涨跌和日内区间都会是平的。
 */
const ENDPOINT = "https://api.gold-api.com/price/XAU";

type Raw = { price?: number; updatedAt?: string };

export const goldapicom: GoldSource = {
  id: "goldapicom",

  available: () => true,

  async quote(ttl): Promise<GoldQuote | null> {
    const [raw, rate] = await Promise.all([getJson<Raw>(ENDPOINT, ttl), usdToCny(ttl)]);
    if (!positive(raw?.price) || !positive(rate)) return null;

    const at = raw.updatedAt ? Date.parse(raw.updatedAt) : Number.NaN;
    return buildQuote({
      ounce: raw.price * rate,
      timestamp: Number.isFinite(at) ? at : Date.now(),
    });
  },
};
