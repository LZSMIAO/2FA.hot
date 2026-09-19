# README 与网站正文

README.md 是繁体正文，docs/readme/ 下保存简体和英文版本。网站关于页直接导入这些文件，读取 website:intro 与 website:body 注释标记之间的正文。修改后随网站构建发布；开发环境由 Vite 热更新。不是浏览器运行时向 GitHub 发请求。

保留标记，编辑标记内的文字即可。徽章、预览和仓库操作说明留在标记外。测试检查三种语言的标记、正文与安全链接处理。

素材出处与授权统一保存在 `credits/`，README 直接链接对应文件。

网站其余 27 种语言的完整关于文章保存在 `i18n/content/<语言>.json`。修改 README 后，需要同步更新这些译文；运行 `node scripts/sync-content-locales.mjs` 刷新英、简、繁 JSON 快照，测试会检查其与 README 一致。三种源语言仍直接读取 README，其他语言按需加载 JSON。
