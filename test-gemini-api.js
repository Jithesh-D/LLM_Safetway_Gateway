// test-gemini-api.js
// Quick test to debug Gemini API connection using official SDK

const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('❌ Error: GEMINI_API_KEY is not set in .env file');
  process.exit(1);
}

console.log('🧪 Testing Gemini API Direct Connection...\n');
console.log('API Key (first 20 chars):', GEMINI_API_KEY.substring(0, 20) + '...');
console.log('Using: Google Generative AI SDK\n');

async function testAPI() {
  try {
    console.log('📤 Initializing Gemini client...\n');
    
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    
    // Use gemini-2.5-flash model
    const modelName = 'gemini-2.5-flash';
    console.log(`📤 Using model: ${modelName}\n`);
    
    const model = genAI.getGenerativeModel({ model: modelName });
    
    const result = await model.generateContent('Say hello in exactly one sentence');
    const response = result.response;
    
    console.log('✅ Success!');
    console.log('Response:', response.text());
  } catch (error) {
    console.log('❌ Error!');
    console.log('Error message:', error.message);
    console.log('Full error:', error);
  }
}

testAPI();
