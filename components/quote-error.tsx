"use client";

import { ArrowsClockwise, PlugsConnected } from "@phosphor-icons/react";
import type { QuoteResult } from "@/lib/types";

const MESSAGES: Record<NonNullable<QuoteResult["error"]> | "unknown", string> = {
  missing_key: "服务端还没有配置 GOLDAPI_KEY，行情接口无法调用。",
  upstream: "goldapi.io 拒绝了这次请求，通常是免费额度用完了。",
  network: "暂时连不上行情源，可能是网络波动。",
  payload: "行情源返回了无法解析的数据。",
  unknown: "行情暂时取不到。",
};

export function QuoteError({
  error,
  refreshing,
  onRetry,
}: {
  error: QuoteResult["error"];
  refreshing: boolean;
  onRetry: () => void;
}) {
  return (
    <section className="border-b border-line">
      <div className="mx-auto w-full max-w-[1400px] px-5 md:px-8">
        <div className="flex min-h-[calc(100dvh-4rem)] flex-col justify-center py-20">
          <div className="max-w-[46ch]">
            <PlugsConnected size={30} weight="regular" className="text-muted" />
            <h1 className="mt-6 text-[26px] font-medium tracking-tight md:text-[32px]">
              现在没有行情可显示
            </h1>
            <p className="mt-4 text-base leading-relaxed text-muted">
              {MESSAGES[error ?? "unknown"]}
            </p>
            <button
              type="button"
              onClick={onRetry}
              disabled={refreshing}
              className="tactile mt-8 inline-flex items-center gap-2 rounded-sm bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-55"
            >
              <ArrowsClockwise
                size={16}
                weight="bold"
                className={refreshing ? "motion-safe:animate-spin" : ""}
              />
              {refreshing ? "重试中" : "重试"}
            </button>
          </div>

          {refreshing ? <QuoteSkeleton /> : null}
        </div>
      </div>
    </section>
  );
}

function QuoteSkeleton() {
  return (
    <div className="mt-16 grid grid-cols-1 gap-10 md:grid-cols-12" aria-hidden="true">
      <div className="md:col-span-7">
        <div className="h-6 w-40 rounded-sm bg-surface-2" />
        <div className="mt-8 h-24 w-[min(100%,26rem)] rounded-sm bg-surface-2" />
        <div className="mt-6 h-7 w-52 rounded-sm bg-surface-2" />
      </div>
      <div className="md:col-span-5">
        <div className="h-64 rounded-md border border-line bg-surface-2" />
      </div>
    </div>
  );
}
