// Shared LLM Configuration for AI Insights
// This file loads configuration from llm-config.json and provides it to all submodules

let LLM_CONFIGS = [];
let LLM_API_ENDPOINT = '/api/insights/analyze';
let LLM_CONFIG_LOADED = false;

// Load configuration from JSON file
async function loadLLMConfig() {
    if (LLM_CONFIG_LOADED) return;

    try {
        const response = await fetch('/keys/js/llm-config.json');
        if (!response.ok) {
            throw new Error(`Failed to load LLM config: ${response.status}`);
        }

        const config = await response.json();
        LLM_CONFIGS = config.llms || [];
        LLM_API_ENDPOINT = config.apiEndpoint || '/api/insights/analyze';
        LLM_CONFIG_LOADED = true;

        console.log('✅ LLM configuration loaded:', LLM_CONFIGS.length, 'providers');
    } catch (error) {
        console.error('❌ Failed to load LLM configuration:', error);
        // Fallback to minimal config
        LLM_CONFIGS = [
            {
                id: 'gemini',
                name: 'Gemini',
                cacheKey: 'geminiInsightsCache',
                defaultModel: 'gemini-1.5-flash',
                requiresApiKey: 'GEMINI_API_KEY'
            }
        ];
    }
}

// Auto-load configuration when script loads
if (typeof window !== 'undefined') {
    loadLLMConfig();
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LLM_CONFIGS, LLM_API_ENDPOINT, loadLLMConfig };
}
