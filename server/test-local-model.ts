
import { generateLocalResponse } from './local-model';

async function testLocalModel() {
  console.log('Testing local AI model...');
  
  try {
    const response = await generateLocalResponse('Write a short greeting in Islamic style', {
      tone: 'respectful',
      minWords: '50',
      maxWords: '100'
    });
    
    console.log('Local model response:');
    console.log('-------------------');
    console.log(response);
    console.log('-------------------');
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Local model test failed:', error);
  }
}

testLocalModel();
