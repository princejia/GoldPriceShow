export function Notes() {
  return (
    <section id="shuoming" className="scroll-mt-16 py-14 md:py-24">
      <div className="mx-auto w-full max-w-[1400px] px-5 md:px-8">
        <h2 className="text-xl font-medium tracking-tight md:text-2xl">关于这些数字</h2>

        <div className="mt-10 grid grid-cols-1 gap-10 md:mt-14 md:grid-cols-12 md:gap-12">
          <article className="md:col-span-7">
            <h3 className="text-lg font-medium tracking-tight">为什么和金店标价对不上</h3>
            <p className="mt-4 max-w-[62ch] text-base leading-relaxed text-muted">
              {"这里显示的是国际现货黄金按当前汇率折算的人民币价格。金店的足金零售价在此之上还要加上加工费、品牌溢价和税费，会明显高出一截；上海黄金交易所的 Au99.99 因为交割方式和汇率基差，同样不会完全一致。把这个页面当趋势参考，不要当成交价用。"}
            </p>
          </article>

          <div className="grid gap-10 md:col-span-5 md:gap-12">
            <article>
              <h3 className="text-lg font-medium tracking-tight">刷新节奏</h3>
              <p className="mt-4 max-w-[52ch] text-base leading-relaxed text-muted">
                {"数据来自 goldapi.io。服务端每十分钟才向上游取一次，页面每分钟从缓存读一次，所以连点刷新未必会看到新数字。"}
              </p>
            </article>

            <article>
              <h3 className="text-lg font-medium tracking-tight">红涨绿跌</h3>
              <p className="mt-4 max-w-[52ch] text-base leading-relaxed text-muted">
                涨用红、跌用绿，跟国内行情软件保持一致，和欧美市场的习惯正好相反。
              </p>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
