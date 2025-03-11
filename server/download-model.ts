
import { downloadModel } from './local-model';

// TinyLlama model URL - this is a small model suitable for Replit
const MODEL_URL = 'https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf';
const MODEL_NAME = 'tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf';

async function main() {
  console.log('Starting model download...');
  try {
    const success = await downloadModel(MODEL_URL, MODEL_NAME);
    if (success) {
      console.log('Model downloaded successfully!');
    } else {
      console.error('Failed to download model.');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
