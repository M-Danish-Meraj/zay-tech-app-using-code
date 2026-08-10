import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const keys = [
  process.env.GEMINI_API_KEY_1,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
].filter(k => k && k.trim() && !k.includes('your_gemini'));

// List of actual models from the listModels call
const models = [
  'gemini-3.5-flash',
  'gemini-3.6-flash',
  'gemini-2.5-flash',
  'gemini-flash-latest',
  'gemini-pro-latest',
  'gemini-2.0-flash',
];

console.log('=== MULTI-KEY MULTI-MODEL SCANNER (2026 VERSION) ===');

for (let ki = 0; ki < keys.length; ki++) {
  const apiKey = keys[ki];
  const shortKey = `...${apiKey.slice(-6)}`;
  console.log(`\n🔑 Testing Key #${ki + 1} (${shortKey})`);

  for (const modelName of models) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: modelName });
      
      console.log(`  🤖 Testing model: ${modelName}`);
      const result = await model.generateContent('Say hello in one word.');
      const text = result.response.text().trim();
      console.log(`    ✅ SUCCESS! Response: "${text}"`);
    } catch (err) {
      console.log(`    ❌ FAILED: ${err.message.slice(0, 150)}`);
    }
  }
}
