# Gemini API Integration Guide

## Overview
This document explains how the LLM Gateway now generates dynamic responses using Google's Generative AI (Gemini) API instead of hardcoded answers.

## Files Created/Modified

### New Files
1. **`gemini-service.js`** - Service module that handles all Gemini API interactions
   - Manages API requests and error handling
   - Provides fallback error messages for API failures
   - Validates API key configuration

### Modified Files
1. **`answer.js`** - Now generates responses dynamically using Gemini
   - Changed from hardcoded answers to async API calls
   - Returns promises that resolve to generated responses
   
2. **`server.js`** - Updated to use async Gemini responses
   - Added `dotenv` loading at the top
   - Updated both whitelisted and analyzed prompt handling
   - Added proper error handling with fallback to Ollama

3. **`package.json`** - Added dotenv dependency
   - New dependency: `"dotenv": "^16.3.1"`

4. **`.env`** - Updated with Gemini API key
   - Added: `GEMINI_API_KEY=AIzaSyCYyfqpCWN0TTvK5KotT3nBZy5HDIacKU0`

## Setup Instructions

### Step 1: Install Dependencies
```bash
npm install
```

This will install the `dotenv` package required for environment variable management.

### Step 2: Verify .env Configuration
The `.env` file should already contain:
```
GEMINI_API_KEY=AIzaSyCYyfqpCWN0TTvK5KotT3nBZy5HDIacKU0
```

### Step 3: Start the Server
```bash
npm run server
```

The server will now use Gemini API to generate responses for safe prompts.

## How It Works

### Flow for Safe Prompts
1. User submits a prompt
2. Safety gateway analyzes the prompt (RITD, NCD, LDF layers)
3. If prompt is marked as SAFE:
   - System calls `getAnswer(prompt)` which triggers Gemini API
   - Gemini generates a relevant response to the prompt
   - Response is displayed in the "LLM Response" section
4. If Gemini API fails:
   - System automatically falls back to Ollama (if available)

### API Response Format
**Request:**
```javascript
{
  contents: [
    {
      parts: [
        { text: "user's prompt/question" }
      ]
    }
  ]
}
```

**Response:**
```javascript
{
  candidates: [
    {
      content: {
        parts: [
          { text: "generated response text" }
        ]
      }
    }
  ]
}
```

## Features

✅ **Dynamic Response Generation** - Responses are generated in real-time based on the prompt
✅ **Error Handling** - Graceful fallback to Ollama if Gemini API fails
✅ **API Key Management** - Secure storage in `.env` file
✅ **Timeout Protection** - 30-second timeout to prevent hanging requests
✅ **Detailed Logging** - Console logs track Gemini API calls for debugging

## Error Scenarios

### Invalid API Key
- **Error**: "Invalid API key. Please check your Gemini API key."
- **Solution**: Verify the GEMINI_API_KEY in `.env` file is correct

### Rate Limit Exceeded
- **Error**: "API rate limit exceeded. Please try again later."
- **Solution**: Wait a few moments before retrying the request

### Request Timeout
- **Error**: "Request timeout. The API took too long to respond."
- **Solution**: Try again, or check your internet connection

### No Response Content
- **Error**: "No response content from Gemini API"
- **Solution**: Check API key validity and API availability

## API Key Security

⚠️ **Important**: The API key is stored in `.env` file which should NOT be committed to version control.

To ensure security:
1. Add `.env` to `.gitignore` if not already present
2. Never share the API key publicly
3. Regenerate the key if it's accidentally exposed

## Testing the Integration

### Using cURL
```bash
curl -X POST http://localhost:3001/analyze \
  -H "Content-Type: application/json" \
  -d '{"prompt":"What is machine learning?"}'
```

### Expected Response (Safe Prompt)
```json
{
  "result": "SAFE",
  "layers": { ... },
  "llmResponse": "Machine learning is a field of computer science where algorithms...",
  "counters": { ... }
}
```

## Troubleshooting

### Problem: Getting "Error: No prompt provided"
- **Cause**: Empty or null prompt sent to getAnswer()
- **Solution**: Ensure the prompt is not empty before sending

### Problem: Gemini not responding
- **Cause**: Network issues or API unavailability
- **Solution**: Check internet connection and Gemini API status

### Problem: dotenv not loading
- **Cause**: dotenv package not installed
- **Solution**: Run `npm install` to install all dependencies

## Future Enhancements

- Response caching to reduce API calls for repeated prompts
- Rate limiting on the client side
- Support for different Gemini models (gemini-pro-vision, etc.)
- Custom system prompts for specialized domains
- Cost tracking and optimization

## Support

For issues or questions about the Gemini integration, refer to:
- [Google Generative AI Documentation](https://ai.google.dev/)
- [Gemini API Reference](https://ai.google.dev/tutorials/rest_quickstart)
