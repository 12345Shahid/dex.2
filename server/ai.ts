import { HfInference } from "@huggingface/inference";

const hf = new HfInference(process.env.HUGGING_FACE_API_KEY);

const HARAM_KEYWORDS = [
  'alcohol', 'pork', 'gambling', 'interest', 'usury',
  'adultery', 'fornication', 'idol', 'shirk',
  'riba', 'intoxication', 'wine', 'beer', 'drugs',
  'haram', 'dating', 'betting', 'lottery',
  // Add more keywords as needed
];

export async function validatePrompt(prompt: string): Promise<{ isHalal: boolean; reason?: string }> {
  console.log('Validating prompt:', prompt);
  const lowercasePrompt = prompt.toLowerCase();

  // First check for explicit haram keywords
  for (const keyword of HARAM_KEYWORDS) {
    if (lowercasePrompt.includes(keyword)) {
      console.log('Found haram keyword:', keyword);
      return {
        isHalal: false,
        reason: `The prompt contains the haram term "${keyword}". This goes against Islamic principles. Please rephrase your request to avoid non-halal topics.`
      };
    }
  }

  // Check for potentially problematic combinations of words
  const suspiciousPatterns = [
    { pattern: /(music|song|dance).*festival/i, message: "Content involving music festivals may not be appropriate." },
    { pattern: /dating.*relationship/i, message: "Content about dating relationships is not appropriate." },
    { pattern: /(interest|loan).*bank/i, message: "Content about banking interest (riba) is not permissible." }
  ];

  for (const { pattern, message } of suspiciousPatterns) {
    if (pattern.test(prompt)) {
      console.log('Found suspicious pattern:', pattern);
      return {
        isHalal: false,
        reason: message + " Please modify your request to align with Islamic principles."
      };
    }
  }

  console.log('Prompt validation passed');
  return { isHalal: true };
}

type GenerationParams = {
  prompt: string;
  negativePrompt?: string;
  minWords?: string;
  maxWords?: string;
  tone?: string;
  tool?: string;
};

import { generateLocalResponse } from './local-model';

async function getFallbackResponse(params: GenerationParams): Promise<string> {
  try {
    console.log('Attempting to use local model for generation...');
    return await generateLocalResponse(params.prompt, params);
  } catch (localError) {
    console.error('Local model fallback failed:', localError);
    return `I apologize, but I am currently experiencing high demand and cannot generate a complete response at this moment. Here is a brief response to your request:

Your prompt: "${params.prompt}"
Tone requested: ${params.tone || 'professional'}
Context: ${params.tool || 'general'} content

Please try again in a few minutes. We are working to improve our service capacity.

Note: This is a temporary response due to reaching our API rate limits. Your credits have not been deducted for this response.`;
  }
}

export async function generateResponse(params: GenerationParams): Promise<string> {
  try {
    console.log('Starting AI generation with params:', params);
    const { prompt, negativePrompt, minWords, maxWords, tone, tool } = params;

    // Construct a detailed prompt for better control
    let systemPrompt = `Generate a Halal and Islamic-appropriate response for the following request. 
Use a ${tone || 'professional'} tone.
Target length: between ${minWords || '500'} and ${maxWords || '1000'} words.
${negativePrompt ? `Avoid the following aspects: ${negativePrompt}` : ''}
Tool context: ${tool || 'general'} content generation.

User request: ${prompt}`;

    console.log('Constructed system prompt:', systemPrompt);
    console.log('Using API key:', process.env.HUGGING_FACE_API_KEY ? 'Present' : 'Missing');
    console.log('Initializing Hugging Face inference...');

    // Use a different, more available model
    const model = "TinyLlama/TinyLlama-1.1B-Chat-v1.0";
    console.log('Using model:', model);

    const response = await hf.textGeneration({
      model,
      inputs: systemPrompt,
      parameters: {
        max_new_tokens: 500,  // Reduced tokens for better reliability
        temperature: 0.7,
        top_p: 0.95,
        repetition_penalty: 1.1,
        return_full_text: false,
      }
    });

    console.log('Response received from API');
    console.log('Response preview:', response.generated_text.slice(0, 100) + '...');
    return response.generated_text;
  } catch (error) {
    console.error('AI generation error details:', error);
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);

      // Check if it's a rate limit error
      if (error.message.includes('exceeded your monthly included credits')) {
        console.log('Rate limit exceeded, using fallback response');
        return await getFallbackResponse(params);
      }
    }
    throw new Error('Failed to generate AI response');
  }
}