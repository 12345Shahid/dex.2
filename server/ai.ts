import { HfInference } from "@huggingface/inference";

const hf = new HfInference(process.env.HUGGING_FACE_API_KEY);

const HARAM_KEYWORDS = [
  'alcohol', 'pork', 'gambling', 'interest', 'usury',
  'adultery', 'fornication', 'idol', 'shirk',
  // Add more keywords as needed
];

export async function validatePrompt(prompt: string): Promise<{ isHalal: boolean; reason?: string }> {
  console.log('Validating prompt:', prompt);
  const lowercasePrompt = prompt.toLowerCase();

  for (const keyword of HARAM_KEYWORDS) {
    if (lowercasePrompt.includes(keyword)) {
      console.log('Found haram keyword:', keyword);
      return {
        isHalal: false,
        reason: `The prompt contains the haram term "${keyword}". This goes against Islamic principles. Please rephrase your request to avoid non-halal topics.`
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

    // Try a different model with better availability
    const model = "mistralai/Mixtral-8x7B-Instruct-v0.1";
    console.log('Using model:', model);

    const response = await hf.textGeneration({
      model,
      inputs: systemPrompt,
      parameters: {
        max_new_tokens: 800,  // Reduced tokens for better stability
        temperature: 0.7,
        top_p: 0.95,
        repetition_penalty: 1.1,
        return_full_text: false,  // Only return the generated part
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
    }
    throw new Error('Failed to generate AI response');
  }
}