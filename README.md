# keys

Embeddable API key manager widget — vanilla HTML/JS/CSS, no build step, no
framework. Lets a page collect and locally encrypt AI provider API keys
(Anthropic, OpenAI, Google, xAI, GitHub, and others), and optionally shows
"server already has this key configured" badges when wired to a backend.

## Files

- `index.html` — standalone page, expects a `localsite` sibling in the same
  webroot for shared header/nav CSS+JS (`../localsite/css/base.css`,
  `../localsite/js/localsite.js`).
- `key-manager.js` — the widget itself (`window.KeyManager`).
- `providers.js` — the list of supported providers/models.
- `style.css` — widget styling.

## Embedding

```html
<script src="providers.js"></script>
<script src="key-manager.js"></script>
<script>
  KeyManager.migrateFromLegacy();
  KeyManager.init(document.getElementById('key-root'));
</script>
```

By default, `key-manager.js` only calls a same-origin app API
(`/api/public-key`, `/api/server-keys`, `/api/validate-key`) when it detects
it's running under a known host app (https, or ports 3000/3700/8888) — it
degrades gracefully to browser-only key storage otherwise.

To point it at a different backend (e.g. the `CloudRoot/worker` Cloudflare
Worker's `GET /api/key-status`), set config before `key-manager.js` loads:

```html
<script>
  window.KEY_MANAGER_CONFIG = {
    serverKeysUrl: 'https://llm-proxy-worker.<subdomain>.workers.dev/api/key-status',
  };
</script>
```

## Consumers

- `chat` (https://github.com/modelearth/chat) — pulls this repo in as a
  submodule for its `/keys` and `/chat/keys` pages. See
  `PLAN-CLEANUP.md` for the (currently on hold) work to fully retire
  chat's own local copy of this widget in favor of this repo.
- The `requests` engine (https://model.earth/requests/engine/).
