# PLAN-CLEANUP.md — retire the in-chat copy of this widget

**Status: DO NOT RUN YET.** Hold every step below until the "Prerequisite"
section is checked off. This file documents what changes once the `keys`
repo (this one) is verified as a standalone, working replacement for the
copy currently tracked inside the `chat` repo at `chat/keys/`.

## Why the wait

`chat`'s copy of this widget shows "server has a key configured" badges by
reading a shared `docker/.env` file (`chat/server.mjs` → `SERVER_KEYS_JSON`
→ `/api/server-keys`). The plan is to stop depending on `docker/.env` for
this and instead read that signal from `CloudRoot/worker` (the Cloudflare
Worker that already holds the real provider secrets). Removing the `chat`
copy before that swap is proven working would leave `chat` with no working
`/keys` page and no fallback.

## Prerequisite (must be checked off before running anything below)

- [ ] `worker/src/index.js` exposes `GET /api/key-status` (added; ships as
      part of this same change) — deployed and confirmed reachable from
      wherever this `keys` repo ends up hosted (CORS origin allow-list in
      `worker/src/index.js`'s `ALLOWED_ORIGINS` will need the actual host
      added — it currently only allows `model.earth`, `dreamstudio.com`,
      and `localhost:8887`).
- [ ] This repo's `index.html` / `key-manager.js`, when loaded from that
      host, set `window.KEY_MANAGER_CONFIG = { serverKeysUrl: "<worker
      URL>/api/key-status" }` before `key-manager.js` loads, and the
      "server key configured" badges reflect real Worker secrets, not
      `docker/.env`.
- [ ] Confirmed working when embedded by the `requests` engine
      (https://model.earth/requests/engine/), not just inside `chat`.
- [ ] Confirmed how `chat` will actually pull this repo in going forward —
      still open per Loren's note that git submodules may not be the final
      answer (packages or another mechanism are on the table). Whatever the
      answer, "Addition" below assumes *some* mechanism exists to get this
      repo's files into `chat`'s served output.

## Removal — inside the `chat` repo

Once the prerequisite is met, these are redundant and should be deleted
from `modelearth/chat`:

- `chat/keys/` (the whole directory — `index.html`, `key-manager.js`,
  `providers.js`, `style.css`) — this is the exact content now living here.
- `chat/app/keys/[asset]/route.ts` — the proxy that serves
  `chat/keys/{key-manager.js,providers.js,style.css}` under `/keys/*`. It
  reads from `process.cwd()/keys/<asset>`, i.e. `chat/keys/`; once that
  directory is gone this route has nothing to serve.
- Decide the fate of `chat/app/key/page.tsx`, `chat/app/key/layout.tsx`,
  `chat/app/keys/page.tsx`, `chat/app/keys/layout.tsx`,
  `chat/app/keys/head.tsx`, `chat/app/chat/keys/page.tsx`,
  `chat/app/chat/keys/head.tsx`, `chat/app/chat/key/page.tsx` (legacy
  redirect) — these are the React wrapper pages that render the widget
  inside chat's own sidebar/navigation chrome. They likely still need to
  exist in some form (see Addition below) but their *content* (the fetch
  calls to `/api/server-keys` etc.) duplicates logic that now lives in
  `key-manager.js` here — don't keep both copies of that logic.
- `chat/server.mjs`'s `tryStatic()` special-casing of `/keys` and
  `/chat/keys` (lines routing to `join(CHAT_DIR, 'keys', ...)`) — update to
  route to wherever this repo's files actually land in `chat`'s tree
  instead.

## Addition — inside the `chat` repo

- Wire `chat`'s `/keys` and `/chat/keys` pages to load this repo's
  `key-manager.js` / `providers.js` / `style.css` from wherever it's pulled
  in (submodule path, package, or otherwise — see open question above),
  instead of from `chat`'s own `keys/` folder.
- Set `window.KEY_MANAGER_CONFIG` in those pages to point
  `serverKeysUrl` at the `CloudRoot/worker` `/api/key-status` endpoint,
  replacing the current `/api/server-keys` (docker/.env-backed) default.
- Keep `chat/app/api/server-keys/route.ts` and the `docker/.env`-reading
  code in `chat/server.mjs` only if something else in `chat` still needs
  them — otherwise remove alongside this, per Loren's note that `auth` and
  `keys` should both stop depending on `docker/.env`.

## Out of scope for this file

- `auth` — same pattern is expected to follow later, but is a separate
  effort with its own PLAN-CLEANUP.md when it's tackled.
- Whether `chat` keeps acting as "the webroot" at all — noted as an open,
  non-essential question (nice to have: figure out how to still share this
  submodule when `chat` is the root). Not a blocker for this plan.
