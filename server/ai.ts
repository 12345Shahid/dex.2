import { HfInference } from "@huggingface/inference";

const hf = new HfInference(process.env.HUGGING_FACE_API_KEY);

const HARAM_KEYWORDS = [
  'alcohol', 'pork', 'gambling', 'interest', 'usury',
  'adultery', 'fornication', 'idol', 'shirk'
];

export async function validatePrompt(prompt: string): Promise<{ isHalal: boolean; reason?: string }> {
  const lowercasePrompt = prompt.toLowerCase();
  
  for (const keyword of HARAM_KEYWORDS) {
    if (lowercasePrompt.includes(keyword)) {
      return {
        isHalal: false,
        reason: `The prompt contains the haram term "${keyword}". This goes against Islamic principles.`
      };
    }
  }

  return { isHalal: true };
}

export async function generateResponse(prompt: string): Promise<string> {
  try {
    const response = await hf.textGeneration({
      model: "mistralai/Mistral-7B-v0.1",
      inputs: `Generate a Halal and Islamic-appropriate response for: ${prompt}`,
      parameters: {
        max_new_tokens: 2048,
        temperature: 0.7,
        top_p: 0.95,
      }
    });

    return response.generated_text;
  } catch (error) {
    console.error('AI generation error:', error);
    throw new Error('Failed to generate AI response');
  }
}
