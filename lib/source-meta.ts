import type { QuoteSourceId } from "@/lib/types";

/** 行情源的署名信息。客户端组件也要用，所以不能放进 server-only 的模块里。 */
export const SOURCE_META: Record<QuoteSourceId, { label: string; url: string; note: string }> = {
  goldapi: {
    label: "goldapi.io",
    url: "https://www.goldapi.io",
    note: "伦敦现货金，需要 API key",
  },
  yahoo: {
    label: "Yahoo Finance",
    url: "https://finance.yahoo.com/quote/GC=F/",
    note: "COMEX 黄金期货 + USD/CNY 汇率，免费无需 key",
  },
  swissquote: {
    label: "Swissquote",
    url: "https://www.swissquote.com/",
    note: "现货金买卖报价 + USD/CNY 汇率，免费无需 key",
  },
  goldapicom: {
    label: "gold-api.com",
    url: "https://gold-api.com/",
    note: "现货金价 + USD/CNY 汇率，免费无需 key",
  },
};
