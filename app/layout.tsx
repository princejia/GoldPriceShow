import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "金价 · 国际现货黄金人民币报价",
  description:
    "国际现货黄金（XAU）折算人民币的克价、盎司价与各成色金价，含日内区间、买卖价与重量换算。",
  openGraph: {
    title: "金价 · 国际现货黄金人民币报价",
    description: "克价、盎司价、各成色金价与重量换算，数据来自 goldapi.io。",
    type: "website",
    locale: "zh_CN",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f5f6" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0d0f" },
  ],
};

// 在首次绘制前读回用户显式选择的主题，避免闪白。内容为静态字面量，不含任何外部输入。
const themeBootstrap = `try{var t=localStorage.getItem("gs-theme");if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t)}}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
