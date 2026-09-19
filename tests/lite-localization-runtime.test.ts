import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'

const catalogs = JSON.parse(
  readFileSync(new URL('../shared/lite-copy.json', import.meta.url), 'utf8')
) as Record<string, { ui: Record<string, string> }>
const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'
const asset = (name: string) =>
  readFileSync(new URL('../public/lite-assets/' + name, import.meta.url), 'utf8')

class Element {
  value = ''
  textContent = ''
  disabled = false
  hidden = false
  checked = false
  href = ''
  src = ''
  style: Record<string, string> = {}
  attributes: Record<string, string> = {}
  children: Element[] = []
  parentNode: Element | null = null
  onchange?: () => void
  oninput?: () => void
  onclick?: () => void
  onload?: () => void
  onerror?: () => void
  setAttribute(name: string, value: string) {
    this.attributes[name] = String(value)
  }
  getAttribute(name: string) {
    return this.attributes[name]
  }
  appendChild(child: Element) {
    this.children.push(child)
    child.parentNode = this
    return child
  }
  removeChild(child: Element) {
    this.children = this.children.filter((item) => item !== child)
    child.parentNode = null
  }
  focus() {}
  select() {}
  setSelectionRange() {}
}

// Only the DOM surface exercised by the real Lite runtime is emulated. No external
// language script is executed until a test explicitly completes its pending load.
function browser(language = 'fr') {
  const ids = [
    'secret',
    'masked-secret',
    'reveal',
    'generate',
    'clear',
    'algorithm',
    'digits',
    'period',
    'error',
    'choices',
    'candidate',
    'review',
    'countdown',
    'standalone',
    'code',
    'copy',
    'link',
    'status',
    'manual',
    'copy-value',
    'language',
    'help',
    'full',
    'lite-messages'
  ]
  const elements = Object.fromEntries(ids.map((id) => [id, new Element()]))
  const element = (id: string) => {
    assert.ok(elements[id], 'Unknown fixture element: ' + id)
    return elements[id]!
  }
  element('lite-messages').textContent = JSON.stringify(catalogs[language]!.ui)
  element('language').value = language
  element('generate').disabled = true
  element('clear').disabled = true
  element('copy').disabled = true
  element('link').disabled = true
  element('reveal').checked = true
  element('algorithm').value = 'SHA-1'
  element('digits').value = '6'
  element('period').value = '30'
  const labels = [
    'secretLabel',
    'reveal',
    'generate',
    'clear',
    'algorithm',
    'digits',
    'period',
    'choose',
    'current',
    'copy',
    'link',
    'manual',
    'privacy',
    'source',
    'compatibility'
  ].map((key) => {
    const node = new Element()
    node.setAttribute('data-text', key)
    node.textContent = catalogs[language]!.ui[key]!
    return node
  })
  const brand = new Element()
  const navigation = new Element()
  const head = new Element()
  const document = {
    documentElement: { lang: language, dir: 'ltr' },
    title: '',
    head,
    getElementById: element,
    querySelectorAll: (selector: string) => {
      assert.equal(selector, '[data-text]')
      return labels
    },
    querySelector: (selector: string) => {
      if (selector === '.brand') return brand
      assert.equal(selector, '[data-navigation]')
      return navigation
    },
    createElement: () => new Element(),
    addEventListener() {},
    execCommand: () => false
  }
  const location = {
    protocol: 'http:',
    host: 'localhost:3001',
    pathname: '/lite',
    search: '?lang=' + language,
    hash: ''
  }
  const history = {
    replaceState(_state: unknown, _title: string, url: string) {
      const next = new URL(url, 'http://localhost:3001')
      location.pathname = next.pathname
      location.search = next.search
      location.hash = next.hash
    }
  }
  class FixedDate extends Date {
    constructor() {
      super(59_000)
    }
  }
  const context = vm.createContext({
    document,
    location,
    history,
    navigator: {},
    Date: FixedDate,
    addEventListener() {},
    setInterval() {
      return 1
    }
  })
  context.window = context
  for (const file of ['sha.js', 'otp.js', 'paste.js', 'ui.js'])
    vm.runInContext(asset(file), context, { filename: file })
  function enter(value: string) {
    element('secret').value = value
    assert.equal(typeof element('secret').oninput, 'function')
    element('secret').oninput!()
  }
  function switchLanguage(next: string) {
    element('language').value = next
    element('language').onchange!()
  }
  function completeLanguage(next: string) {
    const script = head.children.find((node) => node.src.includes('/' + next + '.js'))
    assert.ok(script, 'Language switch should request ' + next)
    vm.runInContext(asset('locales/' + next + '.js'), context)
    script.onload!()
  }
  return {
    element,
    context,
    document,
    labels,
    head,
    location,
    enter,
    switchLanguage,
    completeLanguage
  }
}

test('Lite starts from the server-rendered dictionary without an external language script', () => {
  const app = browser('fr')
  assert.equal(app.context.LiteMessages.fr.title, catalogs.fr!.ui.title)
  assert.equal(app.head.children.length, 0)
  assert.equal(app.element('generate').disabled, false)
  assert.equal(app.element('clear').disabled, false)
  app.enter(secret)
  assert.equal(app.element('code').textContent, '287082')
  assert.equal(app.element('copy').disabled, false)
  assert.equal(app.element('link').disabled, false)
  assert.equal(app.element('error').textContent, '')
})

test('Lite loads a new language without losing the input, current code or controls', () => {
  const app = browser('fr')
  app.enter(secret)
  const previousCode = app.element('code').textContent
  app.switchLanguage('es')
  assert.equal(app.element('language').disabled, true)
  assert.equal(app.document.documentElement.lang, 'fr')
  app.completeLanguage('es')
  assert.equal(app.document.documentElement.lang, 'es')
  assert.equal(app.element('language').value, 'es')
  assert.equal(app.element('language').disabled, false)
  assert.equal(app.element('secret').value, secret)
  assert.equal(app.element('code').textContent, previousCode)
  assert.equal(app.element('copy').disabled, false)
  assert.equal(app.element('link').disabled, false)
  assert.equal(app.element('help').textContent, catalogs.es!.ui.help)
  assert.equal(app.element('countdown').textContent, catalogs.es!.ui.left!.replace('{n}', '1'))
  assert.equal(
    app.element('standalone').href,
    '/lite/code?lang=es#' + secret + '?algorithm=SHA1&digits=6&period=30'
  )
  assert.equal(app.location.search, '?lang=es')
  assert.equal(app.head.children.length, 0)
  // Switching back uses the already-loaded dictionary and must not reload the page.
  app.switchLanguage('fr')
  assert.equal(app.head.children.length, 0)
  assert.equal(app.element('secret').value, secret)
  assert.equal(app.element('code').textContent, previousCode)
  assert.equal(app.document.documentElement.lang, 'fr')
})

test('Lite keeps the old language and input and reports a failed language download', () => {
  const app = browser('fr')
  app.enter(secret)
  app.switchLanguage('es')
  const request = app.head.children[0]!
  request.onerror!()
  assert.equal(app.document.documentElement.lang, 'fr')
  assert.equal(app.element('language').value, 'fr')
  assert.equal(app.element('language').disabled, false)
  assert.equal(app.location.search, '?lang=fr')
  assert.equal(app.element('secret').value, secret)
  assert.equal(app.element('code').textContent, '287082')
  assert.equal(app.element('copy').disabled, false)
  assert.equal(app.element('status').textContent, catalogs.fr!.ui.languageError)
  assert.equal(app.head.children.length, 0)
  app.switchLanguage('es')
  app.completeLanguage('es')
  assert.equal(app.document.documentElement.lang, 'es')
  assert.equal(app.element('secret').value, secret)
  assert.equal(app.element('code').textContent, '287082')
})
