// answer.js
// Service to generate responses using Google's Generative AI (Gemini) API
// Exports a helper `getAnswer(prompt)` which returns a promise that resolves to the generated answer

const { generateGeminiResponse, isApiKeyConfigured } = require('./gemini-service');

/**
 * Get an answer for a given prompt using Gemini API
 * This function returns a Promise that resolves to the generated response
 * @param {string} prompt - The user's prompt/question
 * @returns {Promise<string>} - The generated answer from Gemini
 */
async function getAnswer(prompt) {
  if (!prompt) {
    return 'Error: No prompt provided';
  }

  // Check if API key is configured
  if (!isApiKeyConfigured()) {
    return 'Error: Gemini API key is not configured. Please set the GEMINI_API_KEY environment variable.';
  }

  try {
    // Generate response using Gemini API
    const response = await generateGeminiResponse(prompt);
    return response;
  } catch (error) {
    console.error('[Answer Service] Error:', error.message);
    return `Error: Failed to generate answer - ${error.message}`;
  }
}

module.exports = { getAnswer };
