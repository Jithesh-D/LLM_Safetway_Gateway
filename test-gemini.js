// test-gemini.js
// Simple test to verify Gemini API integration is working

const { generateGeminiResponse, isApiKeyConfigured } = require('./gemini-service');

async function testGeminiIntegration() {
  console.log('🧪 Testing Gemini API Integration...\n');

  // Test 1: Check API Key
  console.log('Test 1: Checking API Key Configuration...');
  const hasApiKey = isApiKeyConfigured();
  if (hasApiKey) {
    console.log('✅ API Key is configured\n');
  } else {
    console.log('❌ API Key is NOT configured\n');
    process.exit(1);
  }

  // Test 2: Simple prompt
  console.log('Test 2: Generating response for a simple prompt...');
  console.log('Prompt: "What is artificial intelligence?"\n');
  
  try {
    const response = await generateGeminiResponse('What is artificial intelligence?');
    console.log('Response received:');
    console.log(response);
    console.log('\n✅ Gemini API is working!\n');
  } catch (error) {
    console.log('❌ Error:', error.message);
    process.exit(1);
  }

  // Test 3: Another prompt
  console.log('\nTest 3: Generating response for another prompt...');
  console.log('Prompt: "Explain photosynthesis"\n');
  
  try {
    const response = await generateGeminiResponse('Explain photosynthesis');
    console.log('Response received:');
    console.log(response);
    console.log('\n✅ Second test passed!\n');
  } catch (error) {
    console.log('❌ Error:', error.message);
    process.exit(1);
  }

  console.log('🎉 All tests passed! Gemini integration is ready to use.');
}

// Run tests
testGeminiIntegration();
