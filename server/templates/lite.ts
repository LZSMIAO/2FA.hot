export default `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="referrer" content="no-referrer" />
    <meta name="robots" content="noindex, nofollow, noarchive" />
    <title>2fa.hot Lite</title>
    <link rel="icon" href="data:," />
    <script src="/lite-assets/theme.js?v=1"></script><link rel="stylesheet" href="/lite-assets/style.css?v=6" />
  </head>
  <body>
    <div class="page">
      <div class="header">
        <div class="header-title"><a class="brand" href="/lite">2fa.hot<span class="brand-beta">BETA</span></a><span class="mode">Lite</span></div>
        <nav class="header-actions" aria-label="Navigation">
          <a id="full" class="full" href="/">Full version</a>
          <select id="language" class="language-select" aria-label="Language">
          <option value="zh-TW">繁體中文</option><option value="zh-CN">简体中文</option><option value="en">English</option>
          </select>
        </nav>
      </div>


      <noscript
        ><p class="error">
          JavaScript is required to calculate codes locally. 請啟用 JavaScript 以在本地取碼。
        </p></noscript
      >
      <div class="panel">
        <div class="secret-heading"><label for="secret" data-text="secretLabel">Secret or otpauth:// link</label><label class="reveal"><span data-text="reveal">Show secret</span><input id="reveal" type="checkbox" checked /></label></div>
        <textarea id="secret" rows="2" autocomplete="off" spellcheck="false" maxlength="100000" placeholder="Base32 secrets or TOTP links"></textarea>
        <input id="masked-secret" type="password" autocomplete="off" aria-label="Secret" hidden />
        <div class="actions input-actions">
          <button id="generate" type="button" class="primary" disabled data-text="generate">
            Paste</button
          ><button id="clear" type="button" disabled data-text="clear">Clear</button>
        </div>
        <div class="options">
          <label
            ><span data-text="algorithm">Algorithm</span
            ><select id="algorithm">
              <option>SHA-1</option>
              <option>SHA-256</option>
              <option>SHA-512</option>
            </select></label
          >
          <label
            ><span data-text="digits">Digits</span
            ><select id="digits">
              <option>6</option>
              <option>8</option>
            </select></label
          >
          <label
            ><span data-text="period">Period (seconds)</span
            ><input id="period" type="text" inputmode="numeric" value="30" maxlength="3"
          /></label>
        </div>
        <p id="error" class="error" role="alert"></p>
        <div class="result">
          <div id="choices" hidden><label for="candidate" data-text="choose">Select a secret</label><select id="candidate"></select><p id="review" class="hint"></p></div>
          <div class="result-heading"><label for="code" data-text="current">Current code</label><p id="countdown" class="countdown"></p><a id="standalone" class="standalone" aria-label="Open code page" hidden>↗</a></div>
          <div id="code" class="code" role="status" aria-label="Current code">------</div>
          <div class="actions">
          <button id="copy" type="button" class="primary" disabled data-text="copy">
            Copy code
          </button>
          <button id="link" type="button" disabled data-text="link">Copy link</button>
          </div>
          <p id="status" class="hint" role="status" aria-live="polite"></p>
          <div id="manual" class="manual">
            <label for="copy-value" data-text="manual">Select and copy manually</label
            ><input id="copy-value" type="text" readonly autocomplete="off" />
          </div>
        </div>
      <p class="privacy" data-text="privacy">
        Secrets stay in this browser. No history is saved. Shared links still contain your secret;
        keep them private.
      </p>
      </div>


      <p class="page-links"><a id="help" href="/lite/help?lang=en">Usage guide</a></p>
      <div class="footer">
        <a href="https://github.com/LZSMIAO/2fa-hot" target="_blank" rel="noopener noreferrer">Source · AGPL-3.0</a><span>2fa.hot Lite</span>
        <strong class="compatibility" data-text="compatibility">Supports Internet Explorer!</strong>
      </div>
    </div>
    <script src="/lite-assets/sha.js"></script>
    <script src="/lite-assets/otp.js"></script>
    <script src="/lite-assets/paste.js"></script>
    <script src="/lite-assets/ui.js?v=4"></script>
  </body>
</html>
`
