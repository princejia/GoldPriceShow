"use client";

import { useEffect, useState } from "react";
import { MoonStars, Sun } from "@phosphor-icons/react";

type Resolved = "light" | "dark";

function readResolved(): Resolved {
  const explicit = document.documentElement.getAttribute("data-theme");
  if (explicit === "light" || explicit === "dark") return explicit;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Resolved | null>(null);

  useEffect(() => {
    setTheme(readResolved());
  }, []);

  const toggle = () => {
    const next: Resolved = readResolved() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("gs-theme", next);
    } catch {
      // 隐私模式下写入会抛错，切换本身仍然生效。
    }
    setTheme(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "切换到浅色主题" : "切换到深色主题"}
      className="tactile inline-flex h-9 w-9 items-center justify-center rounded-sm border border-line text-fg hover:bg-surface-2"
    >
      {theme === "dark" ? (
        <Sun size={17} weight="regular" />
      ) : (
        <MoonStars size={17} weight="regular" />
      )}
    </button>
  );
}
