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
- `js/llm-configs.js` — shared LLM provider list (`LLM_CONFIGS`) and insights
  endpoint (`LLM_API_ENDPOINT`), loaded by `team/projects`. Moved from the
  discontinued `docker` repo.
- `js/llm-config.json` — the data `llm-configs.js` fetches from
  `/keys/js/llm-config.json`; see `js/llm-config.md`.
- `PLAN.md` — key management unification plan (moved from `team/key/`).

## Embedding

```html
<script src="providers.js"></script>
<script src="key-manager.js"></script>
<script>
  KeyManager.migrateFromLegacy();
  KeyManager.init(document.getElementById('key-root'));
</script>
```

By default, `key-manager.js` calls a same-origin app API
(`/api/public-key`, `/api/server-keys`, `/api/validate-key`) when it detects
it's running under a known host app (https, or ports 3000/3700/8888), and
degrades gracefully to browser-only key storage otherwise.

On **https://cloud.model.earth/keys/** those same-origin paths are served by
the CloudRoot Worker, which holds the real provider keys as Cloudflare
secrets, so no configuration is needed. Locally, `chat/server.mjs` serves
them from the env file.

To embed the widget on another site, point it at that Worker (the site's
origin must be listed in the Worker's `ALLOWED_ORIGINS`) before
`key-manager.js` loads:

```html
<script>
  window.KEY_MANAGER_CONFIG = {
    serverKeysUrl: 'https://cloud.model.earth/api/key-status',
    validateKeyUrl: 'https://cloud.model.earth/api/validate-key',
  };
</script>
```

## Consumers

- `chat` (https://github.com/modelearth/chat) — pulls this repo in as a
  submodule for its `/keys` and `/chat/keys` pages. See
  `PLAN-CLEANUP.md` for the (currently on hold) work to fully retire
  chat's own local copy of this widget in favor of this repo.
- The `requests` engine (https://model.earth/requests/engine/).
