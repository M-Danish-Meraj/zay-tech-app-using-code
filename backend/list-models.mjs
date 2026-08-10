import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY_1;
if (!apiKey) {
  console.error('No GEMINI_API_KEY_1 set');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

try {
  console.log('Fetching available models for Key 1...');
  // The JS SDK doesn't have a direct listModels helper in the simplified client, 
  // but we can query it using standard fetch or standard REST endpoint with the API key!
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();
  
  if (data.error) {
    console.log('Error listing models:', data.error);
  } else {
    console.log('Available models:');
    data.models?.forEach(m => {
      console.log(`- ${m.name} (displayName: "${m.displayName}", supportedMethods: ${JSON.stringify(m.supportedGenerationMethods)})`);
    });
  }
} catch (err) {
  console.error('Error:', err);
}
