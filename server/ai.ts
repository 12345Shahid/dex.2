import { HfInference } from "@huggingface/inference";

const hf = new HfInference(process.env.HUGGING_FACE_API_KEY);

const HARAM_KEYWORDS = [
  'alcohol', 'pork', 'gambling', 'interest', 'usury',
  'adultery', 'fornication', 'idol', 'shirk',
  // Add more keywords as needed
];

export async function validatePrompt(prompt: string): Promise<{ isHalal: boolean; reason?: string }> {
  const lowercasePrompt = prompt.toLowerCase();

  for (const keyword of HARAM_KEYWORDS) {
    if (lowercasePrompt.includes(keyword)) {
      return {
        isHalal: false,
        reason: `The prompt contains the haram term "${keyword}". This goes against Islamic principles. Please rephrase your request to avoid non-halal topics.`
      };
    }
  }

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
    const { prompt, negativePrompt, minWords, maxWords, tone, tool } = params;

    // Construct a detailed prompt for better control
    let systemPrompt = `Generate a Halal and Islamic-appropriate response for the following request. 
Use a ${tone || 'professional'} tone.
Target length: between ${minWords || '500'} and ${maxWords || '1000'} words.
${negativePrompt ? `Avoid the following aspects: ${negativePrompt}` : ''}
Tool context: ${tool || 'general'} content generation.

User request: ${prompt}`;

    const response = await hf.textGeneration({
      model: "mistralai/Mistral-7B-v0.1",
      inputs: systemPrompt,
      parameters: {
        max_new_tokens: 2048,
        temperature: 0.7,
        top_p: 0.95,
        repetition_penalty: 1.1,
      }
    });

    return response.generated_text;
  } catch (error) {
    console.error('AI generation error:', error);
    throw new Error('Failed to generate AI response');
  }
}