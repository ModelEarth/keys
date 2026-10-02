# LLM Configuration Guide

This guide explains how to add new AI/LLM providers to the insights system using the centralized configuration file.

## Quick Start: Adding a New Provider

To add a new LLM provider (e.g., Anthropic Claude API, Cohere, etc.), simply add a new entry to the `llms` array in `llm-config.json`.

### Example: Adding Anthropic Claude API

```json
{
  "id": "anthropic",
  "name": "Anthropic",
  "cacheKey": "anthropicInsightsCache",
  "defaultModel": "claude-3-5-sonnet-20241022",
  "requiresApiKey": "ANTHROPIC_API_KEY",
  "keyInfo": {
    "description": "Your API key will be stored in your browser cache.",
    "link": "https://console.anthropic.com/settings/keys",
    "placeholder": "sk-ant-..."
  },
  "apiConfig": {
    "endpoint": "https://api.anthropic.com/v1/messages",
    "method": "POST",
    "headers": {
      "Content-Type": "application/json",
      "x-api-key": "{apiKey}",
      "anthropic-version": "2023-06-01"
    },
    "requestFormat": "anthropic",
    "responseFormat": "anthropic",
    "systemPrompt": "You are a helpful data analyst. Analyze the provided dataset and respond to the user's request.",
    "temperature": 0.7,
    "maxTokens": 2048
  }
}
```

## Configuration Fields

### Required Fields

- **id**: Unique identifier for the provider (used in code)
- **name**: Display name shown to users
- **cacheKey**: localStorage key for caching insights
- **defaultModel**: Default model to use for this provider
- **apiConfig**: Object containing API configuration

### API Configuration

- **endpoint**: API endpoint URL
  - Use `{model}` placeholder for dynamic model substitution
  - Use `{apiKey}` placeholder for dynamic API key substitution

- **method**: HTTP method (usually "POST")

- **headers**: HTTP headers object
  - Use `{apiKey}` placeholder for dynamic API key substitution

- **requestFormat**: Format type for building the request body
  - Supported values: `"gemini"`, `"openai"`, `"anthropic"`
  - Add new formats in `callModelClientSide()` function if needed

- **responseFormat**: Format type for parsing the response
  - Supported values: `"gemini"`, `"openai"`, `"anthropic"`
  - Add new formats in `callModelClientSide()` function if needed

- **systemPrompt**: System prompt for the LLM (if supported)

- **temperature**: Temperature setting (0.0 - 1.0)

- **maxTokens** or **maxOutputTokens**: Maximum output tokens

### Optional Fields

- **requiresApiKey**: Environment variable name for the API key
- **keyInfo**: Object containing API key input UI information
  - **description**: Text shown to user about where the key is stored
  - **link**: URL to get the API key
  - **placeholder**: Placeholder text for the API key input field
- **topK**, **topP**: Additional model parameters (provider-specific)

## Request/Response Formats

### Gemini Format

**Request:**
```json
{
  "contents": [{
    "parts": [{ "text": "prompt here" }]
  }],
  "generationConfig": {
    "temperature": 0.7,
    "topK": 40,
    "topP": 0.95,
    "maxOutputTokens": 2048
  }
}
```

**Response:**
```json
{
  "candidates": [{
    "content": {
      "parts": [{ "text": "response here" }]
    }
  }]
}
```

### OpenAI Format

**Request:**
```json
{
  "model": "gpt-4-turbo-preview",
  "messages": [
    { "role": "system", "content": "system prompt" },
    { "role": "user", "content": "user prompt" }
  ],
  "temperature": 0.7,
  "max_tokens": 2048
}
```

**Response:**
```json
{
  "choices": [{
    "message": {
      "content": "response here"
    }
  }]
}
```

### Anthropic Format

**Request:**
```json
{
  "model": "claude-3-5-sonnet-20241022",
  "max_tokens": 2048,
  "messages": [
    { "role": "user", "content": "user prompt" }
  ],
  "system": "system prompt",
  "temperature": 0.7
}
```

**Response:**
```json
{
  "content": [{
    "text": "response here"
  }]
}
```

## Adding New Request/Response Formats

If your provider uses a different format, add support in `team/projects/index.html` in the `callModelClientSide()` function:

1. **Add request format** in the request body builder section
2. **Add response format** in the response parser section

Example:
```javascript
// In request body builder
else if (format === 'myformat') {
    requestBody = {
        // your custom format
    };
}

// In response parser
else if (responseFormat === 'myformat') {
    if (result.yourField) {
        extractedText = result.yourField.text;
    }
}
```

## Testing Your Configuration

1. Add your configuration to `llm-config.json`
2. Reload the page
3. Check browser console for: `✅ LLM configuration loaded: X providers`
4. Your new provider should appear as an Insights button
5. Test with an API key to verify it works

## File Locations

- **Configuration**: `keys/js/llm-config.json`
- **Loader**: `keys/js/llm-configs.js`
- **Implementation**: `team/projects/index.html` (callModelClientSide function)
- **Display**: `team/js/list.js` (displayInsights function)

## Common Model Names

### Gemini Models (Google)
- `gemini-1.5-flash-latest` - Latest Flash model (fast, cost-effective)
- `gemini-1.5-pro-latest` - Latest Pro model (more capable)
- `gemini-pro` - Legacy model

### OpenAI Models
- `gpt-4-turbo-preview` - GPT-4 Turbo
- `gpt-4` - GPT-4
- `gpt-3.5-turbo` - GPT-3.5 Turbo

### Anthropic Models (Claude)
- `claude-3-5-sonnet-20241022` - Claude 3.5 Sonnet
- `claude-3-opus-20240229` - Claude 3 Opus
- `claude-3-sonnet-20240229` - Claude 3 Sonnet

## Benefits of This Approach

✅ **No code changes** needed to add new providers
✅ **Centralized configuration** in one JSON file
✅ **Easy to maintain** and update
✅ **Consistent behavior** across all providers
✅ **Supports any LLM** with a REST API
