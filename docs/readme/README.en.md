<div align="center">

<h1>2FA.HOT</h1>

**English** · [简体中文](README.zh-CN.md) · [繁體中文](../../README.md)

![Nuxt](https://img.shields.io/badge/Nuxt-4-00DC82?style=flat-square&logo=nuxt&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Vue](https://img.shields.io/badge/Vue-3-4FC08D?style=flat-square&logo=vuedotjs&logoColor=white)

</div>

<!-- website:intro:start -->

A multifunctional online 2FA tool with a Minecraft-inspired design. Paste a 2FA secret to get the current verification code. Supports direct links, with code generation handled locally.

It automatically detects and switches to batch data, and recognizes multiple secret formats—whether it is some fucked-up format copied from Excel, or your customers not knowing what they are doing and copying their password along with the secret, it recognizes the input and gives the appropriate prompts.

An accessible, step-by-step guide with optional voice narration teaches you how to use a secret to log into an account!

More features are being integrated…

<!-- website:intro:end -->

<br>

[![2fa.hot](../../assets/home-en.png)](https://2fa.hot)

[Start](https://2fa.hot) · [Help](https://2fa.hot/help) · [Wishlist](../WAITLIST.md) · [Security](../../.github/SECURITY.md)

<!-- website:body:start -->

## What exactly can it do

Have a feature in mind? Explore the [wishlist](https://2fa.hot/waitlist) and share your ideas on GitHub.

- [Lite](https://2fa.hot/lite?lang=en): single-secret codes, copying and fragment links without animation, sound or the main app framework. 30 languages; targets IE11 compatibility.

- Single and batch codes: supports Base32 secrets and otpauth:// configuration links. Smart recognition of Excel tables, grouped secrets and mixed text.
- QR import: images, drag and drop, or camera; supports Google Authenticator exports, multiple accounts and multi-part exports. Collect all parts, then select the accounts you need.
- Direct links: supports fragment links that display the current code, with one-click copying and batch link generation.
- Local history: off by default, with opt-in storage, optional encryption, backup and restore.
- 30 languages: mobile layouts and light/dark themes. Built-in mistake-prevention guides provide step-by-step, fully guided tutorials for your customers.

Supports TOTP (SHA-1/SHA-256/SHA-512, 6/8 digits) and Steam Guard (5 characters, 30 seconds). For Steam, enter a shared_secret or paste maFile JSON content. HOTP code generation is not supported; HOTP/MD5 accounts in migration files can be parsed and exported.

## Secret storage and access

- All calculations on this site read and process data locally in your browser.
- When you enable local history, records are stored in your browser. You can set a password for encryption, or leave it unset and view records directly.
- Use `/2fa#SECRET`: the fragment after `#` is not sent with the page request. Full links may remain in browser history; never share them publicly.

Finally, do not share them publicly or with anyone you do not trust. Forgotten local-history passphrases cannot be recovered.

[Privacy](https://2fa.hot/privacy)

## Domain drama

I originally wanted 2fa.mc, but gave up because I couldn't register **2FA®** to submit to Monaco's domain registry.
...What if I kept a straight face while writing this?
Then .HOT came along. Fine, fine, I'll admit it: that's sexy. We're going back.

## Why did I make this? Reinventing the wheel?

Friends working in cross-border e-commerce need to log into accounts for tasks such as managing media accounts, while also considering security. Helping more friends with similar needs, as well as people just getting started online, was the starting point.
There are many similar online tools, including ones that generate codes through direct links. But if you didn't know, opening a URL containing a secret, such as `?secret=SECRET`, sends the secret in an HTTP request. The remote website service or CDN receives that data and can record and retain it through access logs, monitoring or application logging. In other words, secrets in those requests may be stored in plain text. Of course, whether it actually retains them depends on its implementation, settings and privacy policy :))

This is the first Vibe coding project I have made public by reinventing a wheel. It inspired me to write a few thoughts; if you are interested, visit my [profile](https://github.com/LZSMIAO).

<!-- website:body:end -->

## Sources and credits

- Minecraft backgrounds, sounds and textures: Mojang / Microsoft. [Panorama](../../credits/PANORAMA-SOURCE.md) · [Audio](../../credits/AUDIO-SOURCE.md) · [Experience bar](../../credits/HUD-SOURCE.md) · [Chest](../../credits/CHEST-SOURCE.md) · [Trial key](../../credits/TRIAL-KEY-SOURCE.md) · [Desert scene](../../credits/DESERT-SOURCE.md).
- Congyu character skin: [Konata on LittleSkin, entry 513373](https://littleskin.cn/skinlib/show/513373). The pose and scene composition are project-created; skin rights remain with the creator.
- Interface design reference: [OreUI](https://katorly.dev/OreUI/zh-CN/).
- Fonts: VT323 Project Authors, Inter Project Authors and JetBrains Mono Project Authors, under SIL Open Font License 1.1. [VT323 license](../../credits/VT323-OFL.txt) · [Inter license](../../credits/Inter-OFL.txt) · [JetBrains Mono license](../../credits/JetBrains-Mono-OFL.txt).
- Interface icons: [Lucide Contributors](https://github.com/lucide-icons/lucide), under the [ISC license](https://github.com/lucide-icons/lucide/blob/main/LICENSE).

This project is not affiliated with or officially partnered with Mojang / Microsoft. Third-party assets retain their respective ownership and licenses; attribution does not grant additional permission. Preview images contain the third-party assets listed above.

## License and public deployments

Project-owned code and documentation in this release use [AGPL-3.0](../../LICENSE) with the reasonable attribution notice in [NOTICE](../../NOTICE). Publicly deployed derivative sites and modified versions providing services to users must offer those users the Corresponding Source. Third-party assets retain their own terms.

```sh
pnpm install
pnpm dev
# Production build
pnpm build
```
