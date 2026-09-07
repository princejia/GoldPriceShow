export function SiteFooter() {
  return (
    <footer className="border-t border-line py-10">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 px-5 text-sm text-muted sm:flex-row sm:items-center sm:justify-between md:px-8">
        <p>页面数据仅供参考，不构成任何投资建议。</p>
        <p>
          行情来自{" "}
          <a
            href="https://www.goldapi.io"
            target="_blank"
            rel="noreferrer noopener"
            className="text-fg underline underline-offset-4 transition-opacity hover:opacity-70"
          >
            goldapi.io
          </a>
        </p>
      </div>
    </footer>
  );
}
