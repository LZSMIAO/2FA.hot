<div align="center">

<h1>2FA.HOT</h1>

[English](docs/readme/README.en.md) · [简体中文](docs/readme/README.zh-CN.md) · **繁體中文**

![Nuxt](https://img.shields.io/badge/Nuxt-4-00DC82?style=flat-square&logo=nuxt&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Vue](https://img.shields.io/badge/Vue-3-4FC08D?style=flat-square&logo=vuedotjs&logoColor=white)

</div>

<!-- website:intro:start -->

多功能線上 2FA 工具， 貼上密鑰，取得目前驗證碼。以 Minecraft 風格為參考設計。支援直鏈、取碼完全由本地處理。

支援自動識別/切換批量數據，同時支援多種密鑰格式 - 無論是從 Excel表單複製過來的傻逼格式、或因您的客戶不會使用、連帶密碼+密鑰一起複製過來，都能識別並有相應提示。
無障礙指南。可選用語音 一對一教學如何使用密鑰登入帳戶！
正在集成更多功能…

<!-- website:intro:end -->

<br>

[![2fa.hot](assets/home-zh-TW.png)](https://2fa.hot)

[開始使用](https://2fa.hot/zh-TW) · [使用說明](https://2fa.hot/zh-TW/help) · [願望單](docs/WAITLIST.md) · [安全漏洞回報](.github/SECURITY.md)

<!-- website:body:start -->

## 具體能做什麼

- 單條／批次取碼：支援 Base32 密鑰、otpauth:// 設定連結；智能識別 Excel 表格、分組密鑰及混合文字。
- 掃碼匯入：圖片、拖放、相機；支援 Google Authenticator 匯出 QR 碼、多帳號和分張匯出，收齊後選擇需要的帳號。
- 連結直達：支援片段直鏈，直接顯示目前驗證碼，可一鍵複製或批量生成連結。
- 本機紀錄：預設不儲存，可主動開啟；支援可選加密、備份與還原。
- 30 種語言：適配手機、深淺主題；內置防呆指南，為你的客戶提供保姆級教學。
- [Lite 輕量版](https://2fa.hot/lite?lang=zh-TW)：兼容IE11。

支援 TOTP（SHA-1／SHA-256／SHA-512、6／8 位）與 Steam Guard（5 位、30 秒）。Steam 可輸入 shared_secret 或貼上 maFile JSON 內容。HOTP 不參與取碼；遷移檔案中的 HOTP／MD5 帳號可解析匯出。

有想要的功能？看看[願望單](https://2fa.hot/zh-TW/waitlist)，或在 GitHub 提出你的想法。

## 密鑰存取

- 本站所有計算在你本地瀏覽器內讀取及處理。
- 主動開啟本機紀錄後，紀錄會儲存在你的瀏覽器中。還可以設定密碼加密保護，也可以不設密碼，直接查看。
- 使用 `/2fa#密鑰`（多個密鑰以 # 分隔：`/2fa#密鑰1#密鑰2`）：瀏覽器不會將 `#` 後面的片段隨頁面請求傳送。完整連結仍可能留在瀏覽器歷史，請勿公開分享。

最後，請勿公開分享或交給不信任的人。忘記本機紀錄口令後，網站無法幫你找回。

[隱私說明](https://2fa.hot/privacy)

## 域名相關

原本想註冊2fa.mc 但由於無法註冊 **2FA®** 以提交摩納哥管局認證作罷。  
...假如我寫這段話的時候繃住了呢。  
於是.HOT 來了。好吧，好吧，我承認這是性感的，我們所以回去。

## 為什麼做這個？重複造輪子？

由於好友做跨境電商，有例如媒體賬戶、矩陣帳號運營的登錄需求，還需考慮安全性。想到能為更多此類朋友們，乃至於剛接觸互聯網的朋友提供幫助，便以此為出發點。
網路上有很多類似的在線工具，還能以直鏈取得代碼。但如果你不知道的話，只要訪問直接帶密鑰的網址，例如 `?secret=密鑰`，瀏覽器會把密鑰隨 HTTP 請求傳送出去，對方的遠端網站服務或 CDN 能收到這份資料，也能透過存取日誌、監控或應用程式記錄並留存。也就是說，這些請求中的密鑰可能被明文儲存。當然，是否實際留存取決於對方的隱私政策:))

這是我公開的第一個 Vibe coding 輪子項目，如果能幫到你真是太好了。

<!-- website:body:end -->

## 素材來源與致謝

- Minecraft 背景、音效與貼圖：Mojang / Microsoft。[背景](credits/PANORAMA-SOURCE.md) · [音效](credits/AUDIO-SOURCE.md) · [經驗條](credits/HUD-SOURCE.md) · [箱子](credits/CHEST-SOURCE.md) · [試煉鑰匙](credits/TRIAL-KEY-SOURCE.md) · [沙漠場景](credits/DESERT-SOURCE.md)。
- 叢雨角色皮膚：[Konata / LittleSkin，作品 513373](https://littleskin.cn/skinlib/show/513373)。角色姿勢與場景編排由本專案製作，皮膚權利歸原作者所有。
- 介面設計參考：[OreUI](https://katorly.dev/OreUI/zh-CN/)。
- 字體：VT323 Project Authors、Inter Project Authors、JetBrains Mono Project Authors，採用 SIL Open Font License 1.1。[VT323 授權](credits/VT323-OFL.txt) · [Inter 授權](credits/Inter-OFL.txt) · [JetBrains Mono 授權](credits/JetBrains-Mono-OFL.txt)。
- 介面圖示：[Lucide Contributors](https://github.com/lucide-icons/lucide)，[ISC 授權](https://github.com/lucide-icons/lucide/blob/main/LICENSE)。

本專案與 Mojang / Microsoft 無隸屬或官方合作關係。第三方素材的權利及授權仍歸各自權利人；列出來源不表示取得額外授權。預覽圖包含上述第三方素材。

## 授權與公開部署

本版本的專案自有程式碼及文件採用 [AGPL-3.0](LICENSE)，並附有 [NOTICE](NOTICE) 的合理來源署名要求。公開部署衍生網站、修改版為用戶提供服務時，須向使用者提供該版本的對應原始碼。第三方素材依各自條款使用。

```sh
pnpm install
pnpm dev
# Production build
pnpm build
```
