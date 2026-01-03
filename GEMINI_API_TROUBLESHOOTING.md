# 🔧 Resolving Gemini API 404 Errors

## Problem
You're getting a **404 Not Found** error from the Gemini API, indicating that the models (like `gemini-pro`, `gemini-1.5-flash`, etc.) are not available with your current API key.

## Root Cause
The API key `AIzaSyCYyfqpCWN0TTvK5KotT3nBZy5HDIacKU0` appears to be valid, but it likely:
- Doesn't have **Gemini API enabled** in the Google Cloud project
- Doesn't have the necessary **permissions/quotas** to access Generative AI models
- Was created before Gemini models were available or in a different project

## Solutions

### Option 1: Create a New API Key with Gemini Access (RECOMMENDED)

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click **"Create API Key"**
3. Make sure it's created in a project that has **Generative AI API enabled**
4. Copy the new API key
5. Update your `.env` file:
   ```
   GEMINI_API_KEY=YOUR_NEW_API_KEY_HERE
   ```
6. Restart the server: `npm run server`

### Option 2: Update Existing API Key Permissions

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Find the project containing your API key
3. Go to **APIs & Services → Enabled APIs**
4. Search for "**Generative AI API**" or "**Google AI for Developers**"
5. Enable it if it's not already enabled
6. Wait 5-10 minutes for changes to propagate

### Option 3: Use Ollama Fallback (Current Setup)

Your system is configured with a fallback mechanism. If Gemini doesn't work:
- Safe prompts will fall back to **Ollama** instead
- This is already implemented in the code
- Make sure Ollama is running: `ollama serve`

## Quick Test

After updating your API key, test it:

```bash
node test-gemini-api.js
```

You should see:
```
✅ Success!
Response: [AI-generated response]
```

## What The Code Does Now

The `gemini-service.js` file:
1. ✅ Tries multiple Gemini models (in order of preference)
2. ✅ Falls back gracefully if one model is unavailable
3. ✅ Returns helpful error messages
4. ✅ Can fallback to Ollama if needed

## Models Tried (In Order)

1. `gemini-2.0-flash` - Latest and fastest
2. `gemini-1.5-pro` - High quality, slower
3. `gemini-1.5-flash` - Good balance
4. `gemini-pro` - Legacy model

## Debugging Steps

### 1. Check API Key Format
```bash
echo $env:GEMINI_API_KEY  # PowerShell
```
Should output a long string starting with `AIza...`

### 2. Verify .env File
```bash
cat .env
```
Should show:
```
GEMINI_API_KEY=AIza...
```

### 3. Check Server Logs
When you run `npm run server`, look for:
- `[Gemini] Generating response for prompt:` - API was called
- `[Gemini] Response generated successfully` - It worked!
- `[Gemini] Model X not available` - Try next model

### 4. Test Directly
```bash
node test-gemini-api.js
```

## Expected Behavior After Fix

1. Submit a safe prompt in the UI
2. "LLM Response" section shows AI-generated answer
3. Console shows:
   ```
   [Gemini] Generating response for prompt: ...
   [Gemini] Trying model: gemini-2.0-flash
   [Gemini] Response generated successfully with gemini-2.0-flash
   ```

## Still Not Working?

If you continue having issues:

1. **Verify the API key is new:**
   - Old API keys may not have Gemini access
   - Create a fresh key from [Google AI Studio](https://aistudio.google.com/app/apikey)

2. **Check billing:**
   - Some free tier limitations may apply
   - Ensure your Google account has billing enabled

3. **Use Ollama only:**
   - If you can't get Gemini working, use Ollama as your LLM
   - Make sure `ollama serve` is running
   - The system will automatically fallback

## Environment Setup

Your current `.env`:
```properties
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b
GEMINI_API_KEY=AIzaSyCYyfqpCWN0TTvK5KotT3nBZy5HDIacKU0
```

To use a different API key, edit this file and restart the server.

## Support

For more information:
- [Google AI Studio](https://aistudio.google.com)
- [Google Generative AI Docs](https://ai.google.dev/)
- [API Key Setup Guide](https://ai.google.dev/tutorials/setup)
