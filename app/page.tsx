import { Notes } from "@/components/notes";
import { QuoteBoard } from "@/components/quote-board";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { fetchGoldQuote } from "@/lib/goldapi";

// 首屏在服务端取数，浏览器拿到的第一帧就有价格，之后由客户端轮询接管。
export const dynamic = "force-dynamic";

export default async function Home() {
  const initial = await fetchGoldQuote();

  return (
    <>
      <SiteNav />
      <main>
        <QuoteBoard initial={initial} />
        <Notes />
      </main>
      <SiteFooter />
    </>
  );
}
