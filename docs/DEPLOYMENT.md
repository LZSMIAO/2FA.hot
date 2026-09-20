# 部署指南

2fa.hot 使用 Nuxt / Nitro 构建为 Cloudflare Worker，无需 KV、R2、D1 或其他数据库绑定。配置见 [`wrangler.jsonc`](../wrangler.jsonc)。

## 1. 修改部署目标

仓库中的 `name`、`account_id` 与 `routes` 指向项目线上站点。Fork 后请替换为自己的配置：

- `name`：你的 Worker 名称。
- `account_id`：你的 Cloudflare 账户 ID，也可以删除此字段，在 Wrangler 登录后选择账户。
- `routes`：改为自己的域名。默认关闭 `workers.dev` 备用地址；Fork 若仅使用该地址，需删除 `routes` 并显式设置 `workers_dev: true`，同时独立保护该入口。
- Fork 或更换域名时，同时更新 `shared/seo/routes.ts` 的 `siteUrl`，它用于 canonical、hreflang、sitemap 和预览域名索引隔离。
- 保留 `main`、`assets`、兼容性标记以及禁止日志采集的设置。

如果配置自定义路由，域名必须在该账户中，匹配的 DNS 记录需要启用 Cloudflare 代理。只修改需要的网站路由，邮件记录无须改动。

配置格式和平台限制以 [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/wrangler/configuration/) 为准，Nuxt 部署方案见 [Nuxt Cloudflare 指南](https://nuxt.com/deploy/cloudflare)。

## 2. 构建和部署

```sh
pnpm install --frozen-lockfile
pnpm exec wrangler login
pnpm deploy:check
pnpm deploy
```

- `deploy:check`：构建并执行上传模拟，不发布。
- `deploy`：构建并发布到配置指定的账户。
- `pnpm exec wrangler deploy`：只发布现有 `.output`，仅在其与当前源码一致时使用。

OAuth/API 令牌保存在本机或 Cloudflare 构建环境，不写入仓库。项目不需要应用层环境变量。

## 3. 连接 GitHub 自动构建

在 Cloudflare Workers 的构建设置中连接你的 GitHub 仓库：

| 配置           | 值                          |
| -------------- | --------------------------- |
| 生产分支       | `main`                      |
| 根目录         | `/`                         |
| 构建命令       | `pnpm run build:cloudflare` |
| 部署命令       | `pnpm exec wrangler deploy` |
| 非生产分支构建 | 关闭，除非你明确需要预览    |

项目原仓库 `LZSMIAO/2FA.hot` 已连接到 `2fa-hot` Worker，推送 `main` 会触发生产部署。Fork 不继承该连接，需要自行配置构建令牌与账户权限。不要将令牌复制进 Issue 或配置文件。

## 4. 日志与响应缓存

`wrangler.jsonc` 明确关闭 Observability、invocation logs 和 Logpush，并禁用版本预览 URL。部署后在 Cloudflare 控制台核对实际设置；其他代理、日志接收器和账户级采集规则需要分别检查。

推荐使用 `/2fa#密钥`，片段不会随页面请求发送。路径中的密钥会经过托管服务，页面警告和服务器重定向都无法阻止第一次请求已携带的密钥。不要对 `/2fa/*` 启用访问 URL 收集、会话回放、预取或静态预生成。不要配置绕过 `no-store` 的缓存规则。

预期响应头：

| 路径            | 响应头                            |
| --------------- | --------------------------------- |
| `/2fa/任意密钥` | `Cache-Control: no-store`         |
| `/2fa/任意密钥` | `Referrer-Policy: no-referrer`    |
| `/2fa/任意密钥` | `X-Robots-Tag: noindex, nofollow` |
| `/history`      | `Cache-Control: no-store`         |

使用公开 RFC 测试密钥检查，**不要使用真实密钥**：

```sh
curl -sSI 'https://你的域名/2fa/GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'
curl -sSI 'https://你的域名/history'
```

## 5. 发布验收与回退

在 Cloudflare 的 **SSL/TLS → 边缘证书** 中启用 **始终使用 HTTPS**，让 HTTP 请求在边缘跳转到 HTTPS。确认通用证书有效，并验证首页及带参数的 `/2fa/:secret` 链接都保留原路径和参数。此设置在 Cloudflare 域名层保存，不随 Worker 构建重置。

```sh
curl -sSI 'http://你的域名/'
```

应返回重定向状态和对应的 `https://` 地址；HTTPS 页面应能正常打开，不出现重定向循环。

1. 运行测试、类型检查、格式检查与 Cloudflare 构建。
2. 在浏览器使用公开演示数据验证单条、批量、复制及链接取码。
3. 核对上述响应头、域名路由及 Worker 日志设置。
4. 在 Workers Builds 中确认当前提交构建并部署成功。

如果线上出现回归，可以在 Cloudflare 的版本/部署页面回退到已验证的版本，同时修复源码；下一次 `main` 推送仍会触发新部署。构建成功不等于安全审计。

## 其他运行环境

```sh
pnpm build
node .output/server/index.mjs
```

这会运行默认 Node 服务。生产环境需要 HTTPS，并保留 Nuxt 设置的响应头。剪贴板和摄像头依赖安全上下文，本地调试可使用 `localhost`。

## SEO 上线

发布后向 Search Console 提交 `/sitemap.xml` 并检查收录。可运行 `node scripts/check-seo.mjs https://你的域名` 检查页面响应与索引设置；私密路由限制适用于所有语言前缀。
