
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Configuration for the local model
const MODEL_DIR = path.join(process.cwd(), 'models');
const DEFAULT_MODEL = 'tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf'; // You'll need to download this

// Make sure the model directory exists
if (!fs.existsSync(MODEL_DIR)) {
  fs.mkdirSync(MODEL_DIR, { recursive: true });
}

export async function downloadModel(modelUrl: string, modelName: string): Promise<boolean> {
  const modelPath = path.join(MODEL_DIR, modelName);
  
  // Check if model already exists
  if (fs.existsSync(modelPath)) {
    console.log(`Model ${modelName} already exists.`);
    return true;
  }
  
  console.log(`Downloading model ${modelName}...`);
  return new Promise((resolve, reject) => {
    exec(`curl -L "${modelUrl}" -o "${modelPath}"`, (error) => {
      if (error) {
        console.error(`Error downloading model: ${error.message}`);
        reject(false);
        return;
      }
      console.log(`Model ${modelName} downloaded successfully.`);
      resolve(true);
    });
  });
}

export async function generateLocalResponse(prompt: string, params: any = {}): Promise<string> {
  const modelPath = path.join(MODEL_DIR, DEFAULT_MODEL);
  
  if (!fs.existsSync(modelPath)) {
    throw new Error(`Model file not found: ${modelPath}`);
  }
  
  // Construct system prompt similar to your existing function
  let systemPrompt = `Generate a Halal and Islamic-appropriate response for the following request. 
Use a ${params.tone || 'professional'} tone.
Target length: between ${params.minWords || '500'} and ${params.maxWords || '1000'} words.
${params.negativePrompt ? `Avoid the following aspects: ${params.negativePrompt}` : ''}
Tool context: ${params.tool || 'general'} content generation.

User request: ${prompt}`;
  
  // Create a temporary file for the prompt
  const promptFile = path.join(process.cwd(), 'temp_prompt.txt');
  fs.writeFileSync(promptFile, systemPrompt);
  
  return new Promise((resolve, reject) => {
    // Run llama.cpp with the prompt
    const llamaCommand = `./llama.cpp/main -m ${modelPath} -f ${promptFile} --temp 0.7 --top_p 0.95 -n 700`;
    
    exec(llamaCommand, (error, stdout, stderr) => {
      // Clean up temp file
      if (fs.existsSync(promptFile)) {
        fs.unlinkSync(promptFile);
      }
      
      if (error) {
        console.error(`Error running local model: ${error.message}`);
        console.error(stderr);
        reject(error);
        return;
      }
      
      // Process and return the output
      const response = stdout.split(systemPrompt)[1]?.trim() || stdout;
      resolve(response);
    });
  });
}
