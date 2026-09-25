<div align="center">

<h1>2FA.HOT</h1>

[English](README.en.md) · **简体中文** · [繁體中文](../../README.md)

![Nuxt](https://img.shields.io/badge/Nuxt-4-00DC82?style=flat-square&logo=nuxt&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Vue](https://img.shields.io/badge/Vue-3-4FC08D?style=flat-square&logo=vuedotjs&logoColor=white)

</div>

<!-- website:intro:start -->

多功能线上 2FA 工具， 以 Minecraft 风格为设计参考。贴上 2FA 密钥，取得目前验证码。支持直链，取码全由本地处理。

它不仅支持自动识别/切换批量数据，同时支持多种密钥格式 - 无论是从 Excel表单复制过来的傻逼格式、或因您的客户不会使用、连带密码+密钥一起复制过来，都能识别并有相应提示。
无障碍指南。可选用语音 一对一教学如何使用密钥登录账户！
正在集成更多功能…

<!-- website:intro:end -->

<br>

[![2fa.hot](../../assets/home-zh-CN.png)](https://2fa.hot)

[开始使用](https://2fa.hot/zh-CN) · [使用说明](https://2fa.hot/zh-CN/help) · [愿望单](../WAITLIST.md) · [安全漏洞报告](../../.github/SECURITY.md)

<!-- website:body:start -->

## 具体能做什么

- [Lite 轻量版](https://2fa.hot/lite?lang=zh-CN)：无动画、音效或主站框架，提供单条取码、复制与片段直链；支持 30 种语言，以 IE11 为兼容目标。
- 单条／批次取码：支持 Base32 密钥、otpauth:// 设置链接；智能识别 Excel 表格、分组密钥及混合文字。
- 扫码导入：图片、拖放、相机；支持 Google Authenticator 导出 QR 码、多账号和分张导出，收齐后选择需要的账号。
- 链接直达：支持片段直链，直接显示目前验证码，可一键复制或批量生成链接。
- 本地记录：默认不存储，可主动开启；支持可选加密、备份与还原。
- 30 种语言：适配手机、深浅主题；内置防呆指南，为你的客户提供保姆级教学。

支持 TOTP（SHA-1／SHA-256／SHA-512、6／8 位）。HOTP 不参与取码；迁移文件中的 HOTP／MD5 账号可解析导出。

有想要的功能？看看[愿望单](https://2fa.hot/zh-CN/waitlist)，或在 GitHub 提出你的想法。

## 密钥存取

- 本站所有计算在你本地浏览器内读取及处理。
- 主动开启本地记录后，记录会存储在你的浏览器中。还可以设置密码加密保护，也可以不设密码，直接查看。
- 使用 `/2fa#密钥`（多个密钥用 # 分隔：`/2fa#密钥1#密钥2`）：浏览器不会将 `#` 后面的片段随页面请求传送。完整链接仍可能留在浏览器历史，请勿公开分享。
- 放大验证码时，地址栏默认使用不含明文密钥的安全链接（`/2fa#~…`）：由你的浏览器在本地加密生成、在本地解开，不经过服务器。拿到完整链接的人仍能打开，请谨慎分享。

最后，请勿公开分享或交给不信任的人。忘记本地记录口令后，网站无法帮你找回。

[隐私说明](https://2fa.hot/privacy)

## 域名相关

原本想注册2fa.mc 但由于无法注册 **2FA®** 以提交摩纳哥管局认证作罢。  
...假如我写这段话的时候绷住了呢。  
于是.HOT 来了。好吧，好吧，我承认这是性感的，我们所以回去。

## 为什么做这个？重复造轮子？

由于好友做跨境电商，有例如媒体账户、矩阵账号运营的登录需求，还需考虑安全性。想到能为更多此类朋友们，乃至于刚接触互联网的朋友提供帮助，便以此为出发点。
网络上有很多类似的在线工具，还能以直链取得代码。但如果你不知道的话，只要访问直接带密钥的网址，例如 `?secret=密钥`，浏览器会把密钥随 HTTP 请求传送出去，对方的远端网站服务或 CDN 能收到这份资料，也能透过存取日志、监控或应用程序记录并留存。也就是说，这些请求中的密钥可能被明文存储。当然，是否实际留存取决于对方的隐私政策:))

这是我公开的第一个 Vibe coding 轮子项目，如果能帮到你真是太好了。

<!-- website:body:end -->

## 素材来源与致谢

- Minecraft 背景、音效与贴图：Mojang / Microsoft。[背景](../../credits/PANORAMA-SOURCE.md) · [音效](../../credits/AUDIO-SOURCE.md) · [经验条](../../credits/HUD-SOURCE.md) · [箱子](../../credits/CHEST-SOURCE.md) · [试炼钥匙](../../credits/TRIAL-KEY-SOURCE.md) · [沙漠场景](../../credits/DESERT-SOURCE.md)。
- 丛雨角色皮肤：[Konata / LittleSkin，作品 513373](https://littleskin.cn/skinlib/show/513373)。角色姿势与场景编排由本项目制作，皮肤权利归原作者所有。
- 界面设计参考：[OreUI](https://katorly.dev/OreUI/zh-CN/)。
- 字体：VT323 Project Authors、Inter Project Authors、JetBrains Mono Project Authors，采用 SIL Open Font License 1.1。[VT323 授权](../../credits/VT323-OFL.txt) · [Inter 授权](../../credits/Inter-OFL.txt) · [JetBrains Mono 授权](../../credits/JetBrains-Mono-OFL.txt)。
- 界面图标：[Lucide Contributors](https://github.com/lucide-icons/lucide)，[ISC 授权](https://github.com/lucide-icons/lucide/blob/main/LICENSE)。

本项目与 Mojang / Microsoft 无隶属或官方合作关系。第三方素材的权利及授权仍归各自权利人；列出来源不表示取得额外授权。预览图包含上述第三方素材。

## 授权与公开部署

本版本的专案自有代码及文件采用 [AGPL-3.0](../../LICENSE)，并附有 [NOTICE](../../NOTICE) 的合理来源署名要求。公开部署衍生网站、修改版为用户提供服务时，须向使用者提供该版本的对应源代码。第三方素材依各自条款使用。

```sh
pnpm install
pnpm dev
# Production build
pnpm build
```
