import { SOURCE_META } from "@/lib/source-meta";
import type { QuoteSourceId } from "@/lib/types";

const ORDER: QuoteSourceId[] = ["goldapi", "yahoo", "swissquote", "goldapicom"];

export function SiteFooter() {
  return (
    <footer className="border-t border-line py-10">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 px-5 text-sm text-muted sm:flex-row sm:items-start sm:justify-between md:px-8">
        <p>页面数据仅供参考，不构成任何投资建议。</p>
        <p className="sm:text-right">
          行情源按顺序回退：
          {ORDER.map((id, i) => (
            <span key={id}>
              {i > 0 ? " › " : " "}
              <a
                href={SOURCE_META[id].url}
                target="_blank"
                rel="noreferrer noopener"
                title={SOURCE_META[id].note}
                className="text-fg underline underline-offset-4 transition-opacity hover:opacity-70"
              >
                {SOURCE_META[id].label}
              </a>
            </span>
          ))}
        </p>
      </div>
    </footer>
  );
}
