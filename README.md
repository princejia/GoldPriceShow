# 金价 · XAU/CNY

国际现货黄金折算人民币的实时报价页。克价为主，盎司、两、钱、公斤为辅，另有各成色熔金价与重量金额互算。

## 本地运行

```bash
npm install
cp .env.example .env.local   # 不填任何 key 也能跑
npm run dev
```

不配 `GOLDAPI_KEY` 也能正常显示行情——会自动用后面几个免费、无需注册的行情源。

## 行情源

按顺序尝试，第一个取到数据的胜出；失败的自动往下一个退。

| id | 数据 | 需要 key | 完整度 |
| --- | --- | --- | --- |
| `goldapi` | [goldapi.io](https://www.goldapi.io) 伦敦现货金，直接以 CNY 计价 | 是 | 完整 OHLC + 买卖价 + 日线历史 |
| `yahoo` | Yahoo Finance `GC=F`（COMEX 黄金期货）× `CNY=X` 汇率 | 否 | 完整 OHLC + 日线历史 |
| `swissquote` | Swissquote 公开报价流的现货 XAU/USD × 汇率 | 否 | 只有当下的买/卖价 |
| `goldapicom` | [gold-api.com](https://gold-api.com/) 现货金价 × 汇率 | 否 | 只有一个价格 |

后三个源只给美元价，汇率单独取，同样是三级降级：Yahoo `CNY=X` → frankfurter → open.er-api，
成功后在内存里缓存 30 分钟；全挂了就沿用上一次的汇率。

几点取舍需要知道：

- **`yahoo` 用的是期货，比现货带约 1% 升水。** 把它排在免费源第一位是因为只有它同时给出
  开盘/昨收/日内高低和日线历史，页面主视觉（涨跌幅、日内区间、每日走势）全靠这些字段。
- `swissquote` 和 `goldapicom` 是真现货，价格更准，但没有昨收和高低，
  落到它们身上时涨跌幅会显示 0.00%、日内区间会是一条平线。
- 想要更准的绝对价格就把 `GOLD_SOURCES` 改成 `swissquote,goldapicom,yahoo`。

页面「更新于」旁边会标出当前这份数据来自哪个源，页脚列出完整的回退链。

## 环境变量

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `GOLDAPI_KEY` | 否 | goldapi.io 的 `x-access-token`。只在服务端读取，不会进入浏览器产物。不填就跳过该源。 |
| `GOLDAPI_KEY_BACKUP` | 否 | 备用令牌。主令牌返回 401/403/429 时自动改用它。 |
| `GOLD_SOURCES` | 否 | 行情源的尝试顺序，逗号分隔。默认 `goldapi,yahoo,swissquote,goldapicom`。写了就只用列出来的。 |
| `GOLD_TTL_SECONDS` | 否 | 向上游取数的最小间隔，默认 `600`。 |
| `GOLD_HISTORY_DAYS` | 否 | 「每日走势」回看的交易日数量，默认 `7`，设为 `0` 关闭。 |

## 部署到 Vercel

```bash
npm i -g vercel
vercel link
vercel --prod
```

不需要配任何环境变量就能上线。想用 goldapi 的话再加：

```bash
vercel env add GOLDAPI_KEY production
vercel env add GOLDAPI_KEY preview
```

或者把仓库推到 GitHub，在 Vercel 控制台 Import Project。框架会被自动识别为 Next.js，
无需额外构建配置。

## 取数与缓存

取数分成两层：

- 浏览器每 60 秒请求一次本站的 `/api/quote`，页面切到后台时暂停；
- `/api/quote` 命中 Next 数据缓存，只有超过 `GOLD_TTL_SECONDS` 才真正打到上游。

所有源都失败时会回落到进程内保存的上一次报价，并在页面上标注「上游暂时取不到」。
若连一次成功的数据都没有，页面显示错误态和重试按钮。

「每日走势」优先用 `goldapi`，没有就用 `yahoo`；后两个源没有历史接口。
`yahoo` 一次请求就能拿到整段日线（和实时行情共用同一份缓存，不额外增加请求），
并且带真实的当日高低，图上每天都会画出区间竖线。

## goldapi 的配额

`goldapi` 免费额度只有 **100 次/月**：按 `GOLD_TTL_SECONDS=600` 算，只要页面被持续访问，
一天就要打 144 次上游，一天就能把整月额度烧光。用 `https://www.goldapi.io/api/stat` 可以随时查本月用量。

额度用尽（401/403/429）时该 key 冷却 6 小时；配了 `GOLDAPI_KEY_BACKUP` 就当场换到备用令牌重试。
两个令牌都不可用时会自动退到免费源，页面不会中断——所以配额问题现在只影响数据的精细程度，
不影响可用性。

它的历史接口是一天一个请求，按日期逐天取；历史数据不会再变，成功过的日期会一直复用。
为了不让冷启动一次把额度打光，单次渲染最多现取 2 天，其余等后续请求慢慢补齐。

## 安全

- API key 只存在于服务端环境变量，客户端通过同源的 `/api/quote` 取数，令牌不会外泄。
- 免费源全部在服务端调用，浏览器不直接访问任何第三方接口。
- `.env.local` 已被 `.gitignore` 忽略，不要提交。
- 令牌一旦在聊天记录、截图或提交历史里出现过，就到 goldapi.io 后台重新生成一个。

## 代码结构

```
lib/
  quote.ts            编排层：按顺序试各个源、进程内兜底、错误归类
  source-meta.ts      各源的署名信息（客户端也会用）
  sources/
    shared.ts         GoldSource 接口、buildQuote() 统一换算、日期工具
    fx.ts             USD→CNY，三级降级 + 内存缓存
    goldapi.ts        goldapi.io（含 key 池与配额冷却）
    yahoo.ts          Yahoo Finance
    swissquote.ts     Swissquote
    goldapicom.ts     gold-api.com
```

新增一个源只要在 `lib/sources/` 下实现 `GoldSource`（把价格换算成人民币每盎司交给
`buildQuote()`），再加进 `lib/quote.ts` 的 `SOURCES` 和 `lib/source-meta.ts` 即可。

