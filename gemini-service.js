// gemini-service.js
// Service to interact with Google's Generative AI (Gemini) API using the official SDK

const { GoogleGenerativeAI } = require('@google/generative-ai');

// Load environment variables
require('dotenv').config();

// API Configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY ;

// Initialize the Generative AI client
let genAI = null;

function initializeGenAI() {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  }
  return genAI;
}

/**
 * Generate a response from Gemini for a given prompt
 * @param {string} prompt - The user's prompt/question
 * @returns {Promise<string>} - The generated response from Gemini
 */
async function generateGeminiResponse(prompt) {
  try {
    if (!prompt || typeof prompt !== 'string') {
      throw new Error('Invalid prompt provided');
    }

    console.log('[Gemini] Generating response for prompt:', prompt.substring(0, 100) + '...');

    // Initialize the client
    const client = initializeGenAI();

    // Use gemini-2.5-flash model (only supported model for this API key)
    const modelName = 'gemini-2.5-flash';
    console.log(`[Gemini] Using model: ${modelName}`);
    
    const model = client.getGenerativeModel({ model: modelName });
    
    // Generate content
    const result = await model.generateContent(prompt);
    const response = result.response;
    
    if (response && response.text && typeof response.text === 'function') {
      const responseText = response.text();
      if (responseText && responseText.length > 0) {
        console.log(`[Gemini] Response generated successfully`);
        return responseText;
      }
    }
    
    throw new Error('No response content from Gemini API');
  } catch (error) {
    console.error('[Gemini] Error generating response:', error.message);
    
    // Return a fallback error message
    if (error.message && error.message.includes('API key')) {
      return `Error: Invalid API key. Please check your Gemini API key.`;
    } else if (error.message && error.message.includes('403')) {
      return `Error: API access denied. Check if your API key has permission to use Gemini.`;
    } else if (error.message && error.message.includes('429')) {
      return `Error: API rate limit exceeded. Please try again later.`;
    } else if (error.message && error.message.includes('not found')) {
      return `Error: No Gemini models available with this API key. Please verify your API key has Gemini API enabled.`;
    } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return `Error: Request timeout. The API took too long to respond.`;
    } else {
      return `Error: Failed to generate response - ${error.message}`;
    }
  }
}

/**
 * Validate if the API key is properly configured
 * @returns {boolean} - True if API key appears valid
 */
function isApiKeyConfigured() {
  return GEMINI_API_KEY && GEMINI_API_KEY.length > 0;
}

module.exports = {
  generateGeminiResponse,
  isApiKeyConfigured
};
