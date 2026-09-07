# 金价 · XAU/CNY

国际现货黄金折算人民币的实时报价页。克价为主，盎司、两、钱、公斤为辅，另有各成色熔金价与重量金额互算。

## 本地运行

```bash
npm install
cp .env.example .env.local   # 填入 GOLDAPI_KEY
npm run dev
```

## 环境变量

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `GOLDAPI_KEY` | 是 | goldapi.io 的 `x-access-token`。只在服务端读取，不会进入浏览器产物。 |
| `GOLD_TTL_SECONDS` | 否 | 向 goldapi 取数的最小间隔，默认 `600`。 |

## 部署到 Vercel

```bash
npm i -g vercel
vercel link
vercel env add GOLDAPI_KEY production
vercel env add GOLDAPI_KEY preview
vercel --prod
```

或者把仓库推到 GitHub，在 Vercel 控制台 Import Project，然后在
Settings → Environment Variables 里加 `GOLDAPI_KEY`。框架会被自动识别为 Next.js，
无需额外构建配置。

## 取数与配额

goldapi.io 免费额度很小，所以取数分成两层：

- 浏览器每 60 秒请求一次本站的 `/api/quote`，页面切到后台时暂停；
- `/api/quote` 命中 Next 数据缓存，只有超过 `GOLD_TTL_SECONDS` 才真正打到 goldapi。

上游失败（限流、网络抖动）时会回落到进程内保存的上一次报价，并在页面上标注
「上游暂时取不到」。若连一次成功的数据都没有，页面显示错误态和重试按钮。

想更省配额就把 `GOLD_TTL_SECONDS` 调大；想更实时就调小，但注意月度额度。

## 安全

- API key 只存在于服务端环境变量，客户端通过同源的 `/api/quote` 取数，令牌不会外泄。
- `.env.local` 已被 `.gitignore` 忽略，不要提交。
- 令牌一旦在聊天记录、截图或提交历史里出现过，就到 goldapi.io 后台重新生成一个。
