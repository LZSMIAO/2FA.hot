import { toolDescriptions, toolHeadings } from '~~/shared/seo/copy'
import { guideMetadata } from '~~/shared/seo/guide-meta'
import {
  isPrivatePage,
  localizedPath,
  pageLocales,
  serializeJsonLd,
  siteUrl,
  unlocalizedPath
} from '~~/shared/seo/routes'
import type { SupportedLocale } from '~~/shared/locales'

export function useSiteSeo() {
  const route = useRoute()
  const { tx, locale } = useMessages()
  useHead(() => {
    const path = unlocalizedPath(route.path)
    const language = locale.value as SupportedLocale
    const privatePage = isPrivatePage(path)
    const locales = pageLocales(path)
    const indexable = !privatePage && locales.includes(language)
    const canonical = siteUrl + localizedPath(path, language)
    const sourceArticle = Object.values(guideMetadata['zh-CN']).find(
      (item) => path === `/guides/${item.slug}`
    )
    const article = sourceArticle
      ? {
          ...sourceArticle,
          title: tx(sourceArticle.title),
          description: tx(sourceArticle.description)
        }
      : undefined
    const guideTitle = tx('2FA 与 TOTP 使用指南')
    let title = toolHeadings[language] || toolHeadings.en
    let description = toolDescriptions[language] || toolDescriptions.en
    if (path === '/help') {
      title = `${tx('使用说明')} · 2FA & TOTP | 2fa.hot`
      description = tx(
        '了解如何生成 TOTP 验证码、导入 QR 二维码、批量处理密钥，并排查 2FA 验证码无效问题。'
      )
    } else if (path === '/privacy') {
      title = tx('隐私说明 — 2fa.hot')
      description =
        tx('密钥如何计算、保存和传递。') + ' ' + tx('记录保存在当前浏览器，可选择密码保护。')
    } else if (path === '/about') {
      title = tx('关于 2fa.hot — 本地 2FA/TOTP 验证码工具')
      description = toolDescriptions[language] || toolDescriptions.en
    } else if (path === '/waitlist') {
      title = `${tx('功能建议')} | 2fa.hot`
      description = tx('看看接下来想做什么，也告诉我们你想要的功能。')
    } else if (path === '/guides') {
      title = `${guideTitle} | 2fa.hot`
      description = tx(
        '了解双重验证与 TOTP，排查无效验证码，学习导入 Google Authenticator 二维码。'
      )
    } else if (article) {
      title = `${article.title} | 2fa.hot`
      description = article.description
    } else if (privatePage) {
      title = tx(path === '/history' ? '本地历史 — 2fa.hot' : '获取验证码 — 2fa.hot')
      description = tx('密钥如何计算、保存和传递。')
    }
    const image = `${siteUrl}/og-image.png`
    const graph: Record<string, unknown>[] = []
    if (indexable) {
      graph.push({
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
        url: `${siteUrl}/`,
        name: '2fa.hot',
        alternateName: '2FA hot'
      })
      graph.push({
        '@type':
          path === '/about' ? 'AboutPage' : path === '/guides' ? 'CollectionPage' : 'WebPage',
        '@id': `${canonical}#webpage`,
        url: canonical,
        name: title,
        description,
        inLanguage: language,
        isPartOf: { '@id': `${siteUrl}/#website` }
      })
      if (path === '/')
        graph.push({
          '@type': 'WebApplication',
          '@id': `${canonical}#app`,
          name: '2fa.hot',
          url: canonical,
          description,
          applicationCategory: 'SecurityApplication',
          operatingSystem: 'Any',
          browserRequirements: 'JavaScript, Web Crypto',
          inLanguage: language,
          isAccessibleForFree: true,
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
          featureList: [
            `TOTP: SHA-1, SHA-256, SHA-512; ${tx('位数')}: 6 / 8`,
            `${tx('批量取码')}: 100`,
            tx('导入二维码，支持 Google Authenticator 导入'),
            tx('可选本地历史')
          ],
          license: 'https://www.gnu.org/licenses/agpl-3.0.html',
          isFamilyFriendly: true,
          sameAs: ['https://github.com/LZSMIAO/2FA.hot'],
          image
        })
      if (path !== '/') {
        const crumbs = [{ name: '2fa.hot', item: siteUrl + localizedPath('/', language) }]
        if (article)
          crumbs.push({ name: guideTitle, item: siteUrl + localizedPath('/guides', language) })
        crumbs.push({ name: article?.title || title.split(' | ')[0]!, item: canonical })
        graph.push({
          '@type': 'BreadcrumbList',
          itemListElement: crumbs.map((crumb, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            ...crumb
          }))
        })
      }
      if (article)
        graph.push({
          '@type': 'Article',
          '@id': `${canonical}#article`,
          headline: article.title,
          description,
          inLanguage: language,
          mainEntityOfPage: { '@id': `${canonical}#webpage` },
          author: { '@type': 'Organization', name: '2fa.hot', url: `${siteUrl}/about` },
          publisher: { '@type': 'Organization', name: '2fa.hot', url: `${siteUrl}/about` },
          image,
          citation: article.sources.map((source) => source.url)
        })
    }
    return {
      title,
      meta: [
        { name: 'description', content: description },
        {
          name: 'robots',
          content: indexable
            ? 'index, follow, max-image-preview:large'
            : 'noindex, nofollow, noarchive'
        },
        // Never expose secret-bearing route URLs in social metadata or structured data.
        ...(indexable
          ? [
              { property: 'og:type', content: article ? 'article' : 'website' },
              { property: 'og:site_name', content: '2fa.hot' },
              { property: 'og:title', content: title },
              { property: 'og:description', content: description },
              { property: 'og:url', content: canonical },
              {
                property: 'og:locale',
                content: `${new Intl.Locale(language).language}_${new Intl.Locale(language).maximize().region}`
              },
              { property: 'og:image', content: image },
              { property: 'og:image:width', content: '1200' },
              { property: 'og:image:height', content: '630' },
              {
                property: 'og:image:alt',
                content: title
              },
              { name: 'twitter:card', content: 'summary_large_image' },
              { name: 'twitter:title', content: title },
              { name: 'twitter:description', content: description },
              { name: 'twitter:image', content: image },
              {
                name: 'twitter:image:alt',
                content: title
              }
            ]
          : [])
      ],
      link: indexable
        ? [
            { rel: 'canonical', href: canonical },
            ...locales.map((code) => ({
              rel: 'alternate' as const,
              hreflang: code,
              href: siteUrl + localizedPath(path, code)
            })),
            { rel: 'alternate' as const, hreflang: 'x-default', href: siteUrl + path }
          ]
        : [],
      script: graph.length
        ? [
            {
              key: 'site-schema',
              type: 'application/ld+json',
              innerHTML: serializeJsonLd({ '@context': 'https://schema.org', '@graph': graph })
            }
          ]
        : []
    }
  })
}
