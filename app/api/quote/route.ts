import { NextResponse } from "next/server";
import { fetchGoldQuote } from "@/lib/goldapi";

// 路由本身不缓存；对 goldapi 的调用频率由 lib 内的 fetch revalidate 控制。
export const dynamic = "force-dynamic";

export async function GET() {
  const result = await fetchGoldQuote();
  return NextResponse.json(result, {
    status: result.ok ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
