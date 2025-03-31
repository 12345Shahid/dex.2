import { HfInference } from "@huggingface/inference";

// Only initialize if we have an API key
let hf: HfInference | null = null;
if (process.env.HUGGING_FACE_API_KEY) {
  hf = new HfInference(process.env.HUGGING_FACE_API_KEY);
}

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

export type GenerationParams = {
  prompt: string;
  negativePrompt?: string;
  minWords?: string;
  maxWords?: string;
  tone?: string;
  tool?: string;
};

// A mock implementation that will always work without external dependencies
function generateMockResponse(prompt: string): string {
  const responses = [
    `Thank you for your question about "${prompt}". As a halal AI assistant, I'm happy to provide an informative response that adheres to Islamic principles.`,
    `Your question about "${prompt}" is an interesting one. Let me offer some insights that are beneficial and in line with Islamic values.`,
    `I've considered your query regarding "${prompt}" and would like to share some thoughts that are both helpful and appropriate from an Islamic perspective.`
  ];
  
  const baseResponse = responses[Math.floor(Math.random() * responses.length)];
  
  return `${baseResponse}
  
In addressing this topic, it's important to approach it with wisdom and consideration for ethical principles. Islam encourages seeking knowledge and understanding the world around us, while maintaining our moral compass.

The Prophet Muhammad (peace be upon him) said: "Seeking knowledge is an obligation upon every Muslim." This hadith reminds us of the importance of education and continuous learning.

When we consider "${prompt}" specifically, we should look at it through the lens of benefit and harm. Does it bring good to ourselves and our community? Does it align with the principles of justice, compassion, and integrity that Islam promotes?

I hope this provides some guidance on your question. If you need more specific information or have follow-up questions, please feel free to ask.

May Allah grant us all beneficial knowledge and guide us to what is best.`;
}

// Try to import the local model, but don't fail if it doesn't exist
let generateLocalResponse: ((prompt: string, params: any) => Promise<string>) | null = null;
try {
  const localModel = require('./local-model');
  generateLocalResponse = localModel.generateLocalResponse;
} catch (error) {
  console.log('Local model not available, will use mock implementation');
}

async function getFallbackResponse(params: GenerationParams): Promise<string> {
  try {
    if (generateLocalResponse) {
      console.log('Attempting to use local model for generation...');
      return await generateLocalResponse(params.prompt, params);
    } else {
      console.log('Using mock implementation...');
      return generateMockResponse(params.prompt);
    }
  } catch (localError) {
    console.error('Local model fallback failed:', localError);
    console.log('Falling back to mock implementation');
    return generateMockResponse(params.prompt);
  }
}

export async function generateResponse(params: GenerationParams): Promise<string> {
  try {
    console.log('Starting AI generation with params:', params);
    
    // If no Hugging Face API key is set, use the fallback immediately
    if (!hf) {
      console.log('No Hugging Face API key set, using fallback response');
      return await getFallbackResponse(params);
    }
    
    const { prompt, negativePrompt, minWords, maxWords, tone, tool } = params;

    // Construct a detailed prompt for better control
    let systemPrompt = `<s>[INST] Generate a Halal and Islamic-appropriate response for the following request. 
Use a ${tone || 'professional'} tone.
Target length: between ${minWords || '500'} and ${maxWords || '1000'} words.
${negativePrompt ? `Avoid the following aspects: ${negativePrompt}` : ''}
Tool context: ${tool || 'general'} content generation.

And if you find the context of the request is Haram meaning that the user wants to generate something which is haram by the rules of Islam. Then politely tell him that it is Haram and also tell the user that why it is Haram I mean give him some references. And then suggest The halal version of the request and also some other halal things related to the request. But if the context of the request is completely halal then simply generate the content.

User request: ${prompt} [/INST]</s>`;

    console.log('Constructed system prompt:', systemPrompt);
    console.log('Using API key:', process.env.HUGGING_FACE_API_KEY ? 'Present' : 'Missing');
    console.log('Initializing Hugging Face inference...');

    // Use Mistral 7B model
    const model = "mistralai/Mistral-7B-Instruct-v0.2";
    console.log('Using model:', model);

    const response = await hf.textGeneration({
      model,
      inputs: systemPrompt,
      parameters: {
        max_new_tokens: 1024,  // Increased for Mistral's capabilities
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
    
    // For any error, use the fallback response
    console.log('Using fallback response due to error');
    return await getFallbackResponse(params);
  }
}