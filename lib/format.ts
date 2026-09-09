const cny = (digits: number) =>
  new Intl.NumberFormat("zh-CN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

export const money = (value: number, digits = 2) => cny(digits).format(value);

export const signedMoney = (value: number, digits = 2) =>
  `${value > 0 ? "+" : value < 0 ? "-" : ""}${cny(digits).format(Math.abs(value))}`;

export const signedPercent = (value: number) =>
  `${value > 0 ? "+" : value < 0 ? "-" : ""}${Math.abs(value).toFixed(2)}%`;

export const clockCN = (ms: number) =>
  new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Shanghai",
  }).format(new Date(ms));

export const dateCN = (ms: number) =>
  new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    timeZone: "Asia/Shanghai",
  }).format(new Date(ms));

/** 把 YYYY-MM-DD 渲染成 “9/8”。 */
export const dayCN = (iso: string) =>
  new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    timeZone: "Asia/Shanghai",
  }).format(new Date(`${iso}T00:00:00+08:00`));

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
