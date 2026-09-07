import { ThemeToggle } from "@/components/theme-toggle";

export function SiteNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-6 px-5 md:px-8">
        <div className="flex items-baseline gap-3">
          <span className="text-[17px] font-semibold tracking-tight">金价</span>
          <span className="num text-xs text-muted">XAU / CNY</span>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="#huansuan"
            className="hidden text-sm text-muted transition-colors hover:text-fg sm:inline"
          >
            重量换算
          </a>
          <a
            href="#shuoming"
            className="hidden text-sm text-muted transition-colors hover:text-fg sm:inline"
          >
            说明
          </a>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
