import "server-only";
import type { DailyHistory, GoldQuote, QuoteResult, QuoteSourceId } from "@/lib/types";
import { goldapi } from "@/lib/sources/goldapi";
import { goldapicom } from "@/lib/sources/goldapicom";
import { quoteTtl, type GoldSource } from "@/lib/sources/shared";
import { swissquote } from "@/lib/sources/swissquote";
import { yahoo } from "@/lib/sources/yahoo";

/**
 * 行情源按顺序尝试，第一个取到数据的胜出。
 * goldapi 数据最全但要 key 且额度小，排最前；后面三个都是免费无 key 的兜底。
 */
const SOURCES: GoldSource[] = [goldapi, yahoo, swissquote, goldapicom];

/** 可以用 GOLD_SOURCES 改顺序或只留其中几个，例如 `yahoo,swissquote`。 */
function pipeline(): GoldSource[] {
  const wanted = process.env.GOLD_SOURCES?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const ordered = wanted?.length
    ? wanted.map((id) => SOURCES.find((s) => s.id === id)).filter((s): s is GoldSource => !!s)
    : SOURCES;

  return ordered.filter((source) => source.available());
}

// 进程内兜底：所有源都挂掉时仍能渲染出上一次的行情。Vercel 上按实例存活，属尽力而为。
let lastGood: { quote: GoldQuote; fetchedAt: number; source: QuoteSourceId } | null = null;

function fallback(error: QuoteResult["error"]): QuoteResult {
  if (lastGood) {
    return {
      ok: true,
      quote: lastGood.quote,
      fetchedAt: lastGood.fetchedAt,
      stale: true,
      source: lastGood.source,
      error,
    };
  }
  return { ok: false, quote: null, fetchedAt: null, stale: true, error };
}

export async function fetchGoldQuote(): Promise<QuoteResult> {
  const ttl = quoteTtl();
  const sources = pipeline();
  if (sources.length === 0) return fallback("no_source");

  let sawNetworkError = false;
  let sawEmptyPayload = false;

  for (const source of sources) {
    try {
      const quote = await source.quote(ttl);
      if (quote) {
        lastGood = { quote, fetchedAt: Date.now(), source: source.id };
        return { ok: true, quote, fetchedAt: lastGood.fetchedAt, stale: false, source: source.id };
      }
      sawEmptyPayload = true;
    } catch (error) {
      sawNetworkError = true;
      console.warn(`[gold] ${source.id} 取数异常：`, error);
    }
  }

  return fallback(sawNetworkError ? "network" : sawEmptyPayload ? "payload" : "upstream");
}

export async function fetchDailyRanges(): Promise<DailyHistory> {
  const limit = Number.parseInt(process.env.GOLD_HISTORY_DAYS ?? "7", 10);
  if (!Number.isFinite(limit) || limit <= 0) return { days: [], reason: "off" };

  for (const source of pipeline()) {
    if (!source.history) continue;
    try {
      const days = await source.history(limit);
      if (days.length > 0) return { days, source: source.id };
    } catch (error) {
      console.warn(`[gold] ${source.id} 历史行情取数异常：`, error);
    }
  }

  return { days: [], reason: "unavailable" };
}
