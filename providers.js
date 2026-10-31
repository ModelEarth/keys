/**
 * providers.js — Static provider + model registry (canonical source).
 *
 * Single source of truth for provider metadata used by:
 *   - Static pages via window.KeyManagerProviders (set when loaded as <script>)
 *   - chat/lib/providers.ts (imported via module.exports for Next.js app code)
 *   - requests/engine/js/app.js (reads window.KeyManagerProviders for model picker)
 *
 * Also kept in sync with lib/db/migrations/0007_seed_data_model_config.sql
 * and lib/storage/types.ts APIProvider type.
 *
 * outputs field (optional): non-text capabilities a model supports.
 * Text output is assumed for all models; only list 'image' and/or 'video' here.
 *
 * apiModel field (optional): the exact model/version identifier to send to the
 * provider's API when it differs from the human-friendly `id`. Example: Tripo
 * requires date-stamped versions like "v3.0-20250812". Consumers fall back to
 * `id` when this is absent, so the API-specific strings live here in config
 * rather than being hardcoded in backend code.
 *
 * keySteps field (optional): numbered steps for creating the key, shown under keyHint.
 * localNote field (optional): a note after the steps shown only on localhost (localsite's .localonly).
 *
 * noCreditsHint field (optional): user-facing message shown when the provider
 * reports the account has no API credits. Kept here in config so the wording
 * and any links are editable without touching backend/frontend code.
 *
 * apiMode field (optional, per-model): which `task3d.modes` entry this model
 * uses (e.g. Tripo versions all use 'text_to_model'). Falls back to the model id.
 *
 * task3d field (optional, provider-level): declarative spec for a task-based 3D
 * generation API (endpoint, request body, response JSON paths, status values,
 * error codes). The Arts Engine frontend builds a per-request spec from this and
 * sends it to the generic Rust 3D runner, so NO provider-specific endpoints or
 * parsing live in backend code. Body strings support {prompt}/{model}/{image_url}
 * placeholders, substituted by the frontend. Shape:
 *   { base, taskIdPath, statusValuePath, statusSuccess[], statusFailure[],
 *     errorMessagePath?, outputPath, outputKeys[], errorCodePath?, noCreditsCode?,
 *     modes: { <mode>: { submitPath, body } } }
 * Submit POSTs to `base + submitPath`; status is polled at `{submitUrl}/{taskId}`.
 */

// Shared across all Tripo models — shown when Tripo returns "no credits" (code 2010).
const TRIPO_NO_CREDITS_HINT =
  'Your Tripo account has no API credits — activate your 14-day free trial at ' +
  'https://platform.tripo3d.ai/billing, then retry.';

const _providers = [
  {
    id: 'github',
    name: 'GitHub',
    keyPlaceholder: 'ghp_... or github_pat_...',
    keyHint: 'Personal Access Token (GITHUB_PERSONAL_ACCESS_TOKEN)',
    getKeyUrl: 'https://github.com/settings/tokens',
    tokenOnly: true,
    models: [],
  },
  {
    id: 'github-reports',
    name: 'GitHub Reports',
    keyPlaceholder: 'ghp_... or github_pat_...',
    keyHint: 'RealityStream Run Models pushes its output to modelearth/reports with this token (GITHUB_REPORTS_TOKEN). Get Key opens GitHub\'s fine-grained token form.',
    keySteps: [
      'Resource owner: modelearth (the organization, not your own account).',
      'Repository access: Only select repositories, then choose reports.',
      'Permissions, Repository permissions, "Contents" and choose "Access: Read and Write". Metadata: Read is added automatically.',
      'Expiration: set one. Run Models warns in red when the token stops working, so you can replace it here.',
    ],
    localNote: 'If your GitHub organization isn\'t listed as a resource owner, or the token stays pending, an organization owner needs to approve it.',
    getKeyUrl: 'https://github.com/settings/personal-access-tokens/new',
    tokenOnly: true,
    models: [],
  },
  {
    id: 'google',
    name: 'Google',
    keyPlaceholder: 'AIza...',
    keyHint: 'Google AI Studio key',
    getKeyUrl: 'https://aistudio.google.com/app/apikey',
    models: [
      { id: 'gemini-3.8-flash',       name: 'Gemini 3.8 Flash',       description: 'Fast, capable model for most tasks',  isDefault: true,  active: true,  supportsThinkingMode: true  },
      { id: 'gemini-4-argon',         name: 'Gemini 4 Argon',         description: 'Most capable Gemini model',           isDefault: false, active: true,  supportsThinkingMode: true  },
      { id: 'gemini-pro-latest',      name: 'Gemini Pro (latest)',    description: 'Newest Pro model, for complex tasks', isDefault: false, active: true,  supportsThinkingMode: true  },
      { id: 'gemini-3.5-flash-lite',  name: 'Gemini 3.5 Flash-Lite',  description: 'Lowest cost, quickest replies',       isDefault: false, active: true  },
      { id: 'gemini-3.1-flash-image', name: 'Nano Banana 2',          description: 'Gemini 3.1 Flash Image generation',   isDefault: false, active: true,  outputs: ['image'] },
      { id: 'gemini-3-pro-image',     name: 'Nano Banana Pro',        description: 'Gemini 3 Pro Image generation',       isDefault: false, active: true,  outputs: ['image'] },
    ],
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    keyPlaceholder: 'sk-ant-...',
    keyHint: 'Claude Console key',
    getKeyUrl: 'https://platform.claude.com/settings/keys',
    models: [
      { id: 'claude-opus-5-5',   name: 'Claude Opus 5.5',   description: 'Most capable Claude model',          isDefault: true,  active: true,  supportsThinkingMode: true },
      { id: 'claude-sonnet-5-5', name: 'Claude Sonnet 5.5', description: 'Balance of speed and capability',    isDefault: false, active: true,  supportsThinkingMode: true },
      { id: 'claude-haiku-5-5',  name: 'Claude Haiku 5.5',  description: 'Fastest, lowest cost Claude model',  isDefault: false, active: true  },
      { id: 'claude-fable-5-1',  name: 'Claude Fable 5.1',  description: 'Claude 5 family model',              isDefault: false, active: true  },
      { id: 'claude-opus-4-8',   name: 'Claude Opus 4.8',   description: 'Previous generation flagship',       isDefault: false, active: false },
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    keyPlaceholder: 'sk-...',
    keyHint: 'OpenAI platform key',
    getKeyUrl: 'https://platform.openai.com/api-keys',
    models: [
      { id: 'gpt-6.1-sol',   name: 'GPT-6.1 Sol',   description: 'Balance of speed and capability', isDefault: true,  active: true  },
      { id: 'gpt-6-astra',   name: 'GPT-6 Astra',   description: 'Most capable OpenAI model',       isDefault: false, active: true  },
      { id: 'gpt-6.1-terra', name: 'GPT-6.1 Terra', description: 'Fast model for everyday tasks',   isDefault: false, active: true  },
      { id: 'gpt-6-luna',    name: 'GPT-6 Luna',    description: 'Small, lowest cost model',        isDefault: false, active: true  },
      { id: 'gpt-image-2',   name: 'GPT Image 2',   description: 'Image generation',                isDefault: false, active: true,  outputs: ['image'] },
    ],
  },
  {
    id: 'xai',
    name: 'xAI',
    keyPlaceholder: 'xai-...',
    keyHint: 'xAI Console key',
    getKeyUrl: 'https://console.x.ai/',
    models: [
      { id: 'grok-4.7',           name: 'Grok 4.7',           description: 'Most capable Grok model',       isDefault: true,  active: true  },
      { id: 'grok-4.3',           name: 'Grok 4.3',           description: 'Faster, lower cost Grok',       isDefault: false, active: true  },
      { id: 'grok-build-0.1',     name: 'Grok Build 0.1',     description: 'Lowest cost Grok model',        isDefault: false, active: true  },
      { id: 'grok-imagine-image', name: 'Grok Imagine Image', description: 'Image generation',              isDefault: false, active: true, outputs: ['image'] },
      { id: 'grok-imagine-video', name: 'Grok Imagine Video', description: 'Video generation',              isDefault: false, active: true, outputs: ['video'] },
    ],
  },
  {
    id: 'groq',
    name: 'Groq',
    keyPlaceholder: 'gsk_...',
    keyHint: 'Groq Console key — free tier includes Whisper transcription (7,200 audio sec/hr)',
    getKeyUrl: 'https://console.groq.com/keys',
    models: [
      { id: 'openai/gpt-oss-120b',     name: 'GPT-OSS 120B',           description: 'OpenAI open-weight model via Groq',                isDefault: true,  active: true },
      { id: 'openai/gpt-oss-20b',      name: 'GPT-OSS 20B',            description: 'Smaller, faster open-weight model',                isDefault: false, active: true },
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B',          description: 'Fast open-source model via Groq',                  isDefault: false, active: true },
      { id: 'llama-3.1-8b-instant',    name: 'Llama 3.1 8B',           description: 'Quickest, lowest cost model on Groq',              isDefault: false, active: true },
      { id: 'whisper-large-v3',        name: 'Whisper Large v3',       description: 'Free speech-to-text transcription, 99 languages',  isDefault: false, active: true },
      { id: 'whisper-large-v3-turbo',  name: 'Whisper Large v3 Turbo', description: 'Whisper at 216× real-time speed via Groq',         isDefault: false, active: true },
    ],
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    keyPlaceholder: 'pplx-...',
    keyHint: 'Perplexity API key',
    getKeyUrl: 'https://www.perplexity.ai/settings/api',
    models: [
      { id: 'sonar', name: 'Sonar', description: 'Answers with web search and citations', isDefault: true, active: true },
    ],
  },
  {
    id: 'pollinations',
    name: 'Pollinations',
    keyPlaceholder: 'pol-...',
    keyHint: 'Pollinations API token (auth.pollinations.ai) for higher tiers',
    getKeyUrl: 'https://enter.pollinations.ai',
    models: [
      { id: 'flux',   name: 'Flux Schnell',  description: 'Fast Black Forest Labs Flux model', isDefault: true,  active: true, outputs: ['image'] },
      { id: 'zimage', name: 'Z-Image Turbo', description: 'Alibaba Z-Image Turbo',             isDefault: false, active: true, outputs: ['image'] },
    ],
  },
  {
    id: 'meshy',
    name: 'Meshy',
    keyPlaceholder: 'msy-...',
    keyHint: '100 free credits/month — Pro plan required for API access',
    getKeyUrl: 'https://www.meshy.ai/api',
    task3d: {
      base: 'https://api.meshy.ai/openapi',
      taskIdPath: 'result',
      statusValuePath: 'status',
      statusSuccess: ['SUCCEEDED'],
      statusFailure: ['FAILED', 'CANCELED', 'EXPIRED'],
      errorMessagePath: 'task_error.message',
      outputPath: 'model_urls',
      outputKeys: ['glb', 'usdz', 'fbx', 'obj'],
      modes: {
        'text-to-3d':  { submitPath: '/v2/text-to-3d',  body: { mode: 'preview', prompt: '{prompt}', art_style: 'realistic', should_remesh: true } },
        'image-to-3d': { submitPath: '/v1/image-to-3d', body: { image_url: '{image_url}', should_texture: true } },
      },
    },
    models: [
      { id: 'text-to-3d',        name: 'Text to 3D',         description: 'Generate 3D models from text prompts (meshy-6)',      isDefault: true,  active: true, outputs: ['3d'], apiMode: 'text-to-3d' },
      { id: 'image-to-3d',       name: 'Image to 3D',        description: 'Generate 3D models from a reference image',          isDefault: false, active: true, outputs: ['3d'], apiMode: 'image-to-3d' },
      { id: 'multiimage-to-3d',  name: 'Multi-Image to 3D',  description: 'Generate 3D from multiple reference images',         isDefault: false, active: true, outputs: ['3d'], apiMode: 'image-to-3d' },
      { id: 'ai-texturing',      name: 'AI Texturing',       description: 'Apply AI-generated textures to existing 3D meshes',  isDefault: false, active: true, outputs: ['3d'], apiMode: 'text-to-3d' },
    ],
  },
  {
    id: 'tripo',
    name: 'Tripo',
    keyPlaceholder: 'tsk_...',
    keyHint: '300 free credits/month (~24 models) — platform.tripo3d.ai',
    getKeyUrl: 'https://platform.tripo3d.ai/api-keys',
    task3d: {
      base: 'https://api.tripo3d.ai/v2/openapi',
      taskIdPath: 'data.task_id',
      statusValuePath: 'data.status',
      statusSuccess: ['success'],
      statusFailure: ['failed', 'cancelled', 'banned', 'expired'],
      outputPath: 'data.output',
      outputKeys: ['pbr_model', 'model'],
      errorCodePath: 'code',   // Tripo wraps errors in a numeric code (can appear in a 200 body)
      noCreditsCode: 2010,     // → NO_CREDITS sentinel → noCreditsHint
      modes: {
        'text_to_model': { submitPath: '/task', body: { type: 'text_to_model', prompt: '{prompt}', model_version: '{model}' } },
      },
    },
    models: [
      { id: 'v3.0',  name: 'Tripo v3.0',  description: 'Stable text/image-to-3D generation',             isDefault: true,  active: true, outputs: ['3d'], apiMode: 'text_to_model', apiModel: 'v3.0-20250812', noCreditsHint: TRIPO_NO_CREDITS_HINT },
      { id: 'v3.1',  name: 'Tripo v3.1',  description: 'Enhanced quality 3D generation',                 isDefault: false, active: true, outputs: ['3d'], apiMode: 'text_to_model', apiModel: 'v3.1-20260211', noCreditsHint: TRIPO_NO_CREDITS_HINT },
      { id: 'p1',    name: 'Tripo P1',    description: 'Premium game-ready 3D with higher fidelity',     isDefault: false, active: true, outputs: ['3d'], apiMode: 'text_to_model', apiModel: 'P1-20260311', noCreditsHint: TRIPO_NO_CREDITS_HINT },
    ],
  },
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    keyPlaceholder: '',
    keyHint: '10,000 free characters/month TTS — elevenlabs.io',
    getKeyUrl: 'https://elevenlabs.io/app/settings/api-keys',
    models: [
      { id: 'eleven_flash_v2_5',      name: 'Flash v2.5',          description: 'Fast TTS included in free tier',                  isDefault: true,  active: true, outputs: ['audio'] },
      { id: 'eleven_multilingual_v2', name: 'Multilingual v2',     description: 'High-quality TTS in 29+ languages',              isDefault: false, active: true, outputs: ['audio'] },
      { id: 'eleven_turbo_v2_5',      name: 'Turbo v2.5',          description: 'Low-latency TTS for real-time applications',     isDefault: false, active: true, outputs: ['audio'] },
      { id: 'scribe_v1',              name: 'Scribe v1 (STT)',      description: 'Accurate speech-to-text with speaker diarization', isDefault: false, active: true },
    ],
  },
  {
    id: 'discord',
    name: 'Discord Bot',
    keyPlaceholder: '',
    keyHint: 'Discord bot token (DISCORD_BOT_TOKEN)',
    getKeyUrl: 'https://discord.com/developers/applications',
    tokenOnly: true,
    models: [],
  },
  {
    id: 'pinecone',
    name: 'Pinecone',
    keyPlaceholder: 'pcsk_...',
    keyHint: 'Vector DB for repository retrieval (PINECONE_API_KEY)',
    getKeyUrl: 'https://app.pinecone.io/organizations/-/keys',
    tokenOnly: true,
    models: [],
  },
  {
    id: 'voyage',
    name: 'Voyage AI',
    keyPlaceholder: 'pa-...',
    keyHint: 'Embedding model for repository retrieval (VOYAGE_API_KEY)',
    getKeyUrl: 'https://dash.voyageai.com/api-keys',
    tokenOnly: true,
    models: [],
  },
  {
    id: 'supabase',
    name: 'Supabase',
    keyPlaceholder: 'https://xxxx.supabase.co',
    keyHint: 'Supabase project URL — enables chat history and email/password login (NEXT_PUBLIC_SUPABASE_URL)',
    getKeyUrl: 'https://supabase.com/dashboard',
    tokenOnly: true,
    models: [],
  },
];

// Browser global (loaded via <script> tag)
if (typeof window !== 'undefined') window.KeyManagerProviders = _providers;

// Node.js / CommonJS (imported by chat/lib/providers.ts)
if (typeof module !== 'undefined' && module.exports) module.exports = _providers;

// CLI providers — shown only on localhost (no API key required)
if (typeof location !== 'undefined' && (location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  _providers.push(
    {
      id: 'claude-code-cli',
      name: 'Claude Code CLI',
      keyPlaceholder: '',
      keyHint: 'Local CLI — no API key required',
      getKeyUrl: 'https://claude.ai/download',
      cliOnly: true,
      models: [
        { id: 'claude-code', name: 'Claude Code', description: 'Claude Code CLI running locally', isDefault: true, active: true },
      ],
    },
    {
      id: 'codex-cli',
      name: 'Codex CLI',
      keyPlaceholder: '',
      keyHint: 'Local CLI — no API key required',
      getKeyUrl: 'https://github.com/openai/codex',
      cliOnly: true,
      models: [
        { id: 'codex', name: 'OpenAI Codex', description: 'OpenAI Codex CLI running locally', isDefault: true, active: true },
      ],
    }
  );
}
