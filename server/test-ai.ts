import { HfInference } from "@huggingface/inference";
import { validatePrompt, generateResponse } from "./ai";

async function runTests() {
  console.log('Starting AI functionality tests...\n');

  // Test 1: API Connection
  console.log('Test 1: Testing Hugging Face API connection');
  try {
    const hf = new HfInference(process.env.HUGGING_FACE_API_KEY);
    console.log('✓ API client initialized\n');
  } catch (error) {
    console.error('✗ Failed to initialize API client:', error, '\n');
  }

  // Test 2: Content Validation
  console.log('Test 2: Testing content validation');
  const validPrompts = [
    "Write about Islamic architecture",
    "Generate a poem about kindness"
  ];
  const invalidPrompts = [
    "Write about alcohol consumption",
    "Generate content about gambling"
  ];

  for (const prompt of validPrompts) {
    const result = await validatePrompt(prompt);
    console.log(`Testing valid prompt: "${prompt}"`);
    console.log('Result:', result, '\n');
  }

  for (const prompt of invalidPrompts) {
    const result = await validatePrompt(prompt);
    console.log(`Testing invalid prompt: "${prompt}"`);
    console.log('Result:', result, '\n');
  }

  // Test 3: Complete Generation Flow
  console.log('Test 3: Testing complete generation flow');
  const testParams = {
    prompt: "Write a short Islamic prayer",
    negativePrompt: "Avoid complex language",
    minWords: "50",
    maxWords: "100",
    tone: "respectful",
    tool: "general"
  };

  try {
    console.log('Testing with params:', testParams);
    const response = await generateResponse(testParams);
    console.log('✓ Generation successful');
    console.log('Response preview:', response.slice(0, 100), '...\n');
  } catch (error) {
    console.error('✗ Generation failed:', error, '\n');
  }
}

// Run the tests
console.log('=== AI Functionality Test Suite ===\n');
runTests().catch(console.error);
