"use client";

import { useEffect, useState } from "react";
import { CaretDown } from "@phosphor-icons/react";
import type { GoldQuote } from "@/lib/types";
import { money } from "@/lib/format";

const sanitize = (raw: string) =>
  raw
    .replace(/[^\d.]/g, "")
    .replace(/(\..*)\./g, "$1")
    .slice(0, 12);

export function Converter({ quote }: { quote: GoldQuote }) {
  const options = [{ label: "24K", purity: 99.9, gram: quote.gram }, ...quote.karats];

  const [karatLabel, setKaratLabel] = useState("24K");
  const [grams, setGrams] = useState("10");
  const [amount, setAmount] = useState("");
  const [last, setLast] = useState<"grams" | "amount">("grams");

  const unit = options.find((option) => option.label === karatLabel) ?? options[0];

  // 行情每分钟会刷新，成色也可能被切换，两种情况下都以用户最后编辑的那一侧为准重算。
  useEffect(() => {
    if (last === "grams") {
      const value = Number.parseFloat(grams);
      setAmount(Number.isFinite(value) && value > 0 ? (value * unit.gram).toFixed(2) : "");
    } else {
      const value = Number.parseFloat(amount);
      setGrams(Number.isFinite(value) && value > 0 ? (value / unit.gram).toFixed(3) : "");
    }
    // grams / amount 由本效应写入，不能进依赖数组。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit.gram, last]);

  const onGrams = (raw: string) => {
    const next = sanitize(raw);
    setLast("grams");
    setGrams(next);
    const value = Number.parseFloat(next);
    setAmount(Number.isFinite(value) && value > 0 ? (value * unit.gram).toFixed(2) : "");
  };

  const onAmount = (raw: string) => {
    const next = sanitize(raw);
    setLast("amount");
    setAmount(next);
    const value = Number.parseFloat(next);
    setGrams(Number.isFinite(value) && value > 0 ? (value / unit.gram).toFixed(3) : "");
  };

  const invalid = grams.length > 0 && !(Number.parseFloat(grams) > 0);

  return (
    <section
      id="huansuan"
      className="scroll-mt-16 border-b border-line bg-surface-2 py-14 md:py-20"
    >
      <div className="mx-auto w-full max-w-[1400px] px-5 md:px-8">
        <h2 className="text-xl font-medium tracking-tight md:text-2xl">重量与金额互算</h2>
        <p className="mt-3 max-w-[52ch] text-sm leading-relaxed text-muted">
          两边任意输入一侧，另一侧按所选成色的熔金价即时折算。
        </p>

        <div className="mt-10 grid grid-cols-1 items-start gap-6 md:mt-12 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-3">
            <label htmlFor="karat" className="block text-sm text-muted">
              成色
            </label>
            <div className="relative mt-2">
              <select
                id="karat"
                value={karatLabel}
                onChange={(event) => setKaratLabel(event.target.value)}
                className="num h-14 w-full appearance-none rounded-sm border border-line bg-surface px-4 pr-11 text-lg text-fg"
              >
                {options.map((option) => (
                  <option key={option.label} value={option.label}>
                    {option.label}
                  </option>
                ))}
              </select>
              <CaretDown
                size={16}
                weight="bold"
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted"
              />
            </div>
          </div>

          <div className="md:col-span-4">
            <label htmlFor="grams" className="block text-sm text-muted">
              克重
            </label>
            <div className="relative mt-2">
              <input
                id="grams"
                value={grams}
                onChange={(event) => onGrams(event.target.value)}
                inputMode="decimal"
                autoComplete="off"
                placeholder="0.000"
                aria-invalid={invalid}
                aria-describedby="grams-help"
                className="num h-14 w-full rounded-sm border border-line bg-surface px-4 pr-14 text-lg text-fg placeholder:text-muted"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted">
                克
              </span>
            </div>
            <p id="grams-help" className={`mt-2 text-sm ${invalid ? "text-up" : "text-muted"}`}>
              {invalid ? "请输入一个大于 0 的数字" : `当前 ${unit.label} 熔金价 ${money(unit.gram)} 元/克`}
            </p>
          </div>

          <div className="hidden md:col-span-1 md:mt-7 md:flex md:h-14 md:items-center md:justify-center">
            <span className="text-lg text-muted">≈</span>
          </div>

          <div className="md:col-span-4">
            <label htmlFor="amount" className="block text-sm text-muted">
              金额
            </label>
            <div className="relative mt-2">
              <input
                id="amount"
                value={amount}
                onChange={(event) => onAmount(event.target.value)}
                inputMode="decimal"
                autoComplete="off"
                placeholder="0.00"
                aria-describedby="amount-help"
                className="num h-14 w-full rounded-sm border border-line bg-surface px-4 pr-14 text-lg text-fg placeholder:text-muted"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted">
                元
              </span>
            </div>
            <p id="amount-help" className="mt-2 text-sm text-muted">
              仅为金料价值，未计工费、税费与回收折价。
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
