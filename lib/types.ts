export type Karat = {
  label: string;
  purity: number;
  gram: number;
};

export type GoldQuote = {
  ounce: number;
  gram: number;
  kilogram: number;
  tael: number;
  openPrice: number;
  prevClose: number;
  lowOunce: number;
  highOunce: number;
  lowGram: number;
  highGram: number;
  openGram: number;
  prevCloseGram: number;
  change: number;
  changePercent: number;
  changeGram: number;
  askGram: number;
  bidGram: number;
  spreadGram: number;
  timestamp: number;
  karats: Karat[];
};

/** 某一交易日的克价区间，日期为上海时区的 YYYY-MM-DD。 */
export type DailyRange = {
  date: string;
  lowGram: number;
  highGram: number;
  closeGram: number;
};

export type DailyHistory = {
  days: DailyRange[];
  /** days 为空时的原因：off = 没开这个模块，unavailable = 上游暂时取不到。 */
  reason?: "off" | "unavailable";
};

export type QuoteResult = {
  ok: boolean;
  quote: GoldQuote | null;
  /** 上游数据实际取回的时刻（毫秒）。 */
  fetchedAt: number | null;
  /** true 表示这是上一次成功的数据，本次向上游取数失败了。 */
  stale: boolean;
  error?: "missing_key" | "upstream" | "network" | "payload";
};
