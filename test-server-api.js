// test-server-api.js
// Test the full server API with Gemini

const axios = require('axios');

const SERVER_URL = 'http://localhost:3001';

async function testServerAPI() {
  try {
    console.log('🧪 Testing LLM Gateway Server API...\n');
    console.log('📤 Sending a safe prompt to the gateway...\n');
    
    const response = await axios.post(`${SERVER_URL}/analyze`, {
      prompt: 'What is machine learning?'
    });
    
    console.log('✅ Server Response Received!\n');
    console.log('Result Status:', response.data.result);
    console.log('\n📝 LLM Response:');
    console.log(response.data.llmResponse);
    
    if (response.data.llmResponse && !response.data.llmResponse.includes('Error')) {
      console.log('\n✅ SUCCESS! Gemini is working through the server!');
    } else {
      console.log('\n⚠️ Got a response but it contains an error');
    }
  } catch (error) {
    console.log('❌ Error!');
    console.log('Error message:', error.message);
    console.log('\nMake sure the server is running: npm run server');
  }
}

testServerAPI();
