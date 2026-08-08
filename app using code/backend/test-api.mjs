import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const keys = [
  process.env.GEMINI_API_KEY_1,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
  process.env.GEMINI_API_KEY,
];

console.log('=== ENV KEY CHECK ===');
keys.forEach((k, i) => {
  if (!k || k.trim() === '') {
    console.log(`Key ${i+1}: (not set)`);
  } else if (k.includes('your_gemini')) {
    console.log(`Key ${i+1}: PLACEHOLDER - not a real key! Value="${k}"`);
  } else {
    console.log(`Key ${i+1}: ${k.slice(0,8)}...${k.slice(-4)} (length=${k.length}) — looks real`);
  }
});

// Try the first real key with a basic API call
const validKeys = keys.filter(k => k && k.trim() && !k.includes('your_gemini'));
console.log(`\nValid keys found: ${validKeys.length}`);

if (validKeys.length === 0) {
  console.log('\n❌ NO VALID KEYS — You must paste a real Gemini API key into .env');
  console.log('   Get one free at: https://aistudio.google.com/app/apikey');
  process.exit(1);
}

console.log('\n=== TESTING API CALL ===');
const genAI = new GoogleGenerativeAI(validKeys[0]);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

try {
  const result = await model.generateContent('Say hello in one word.');
  const text = result.response.text();
  console.log('✅ API works! Response:', text);
} catch (err) {
  console.log('❌ API Error:', err.message);
  console.log('Status:', err.status || 'unknown');
}
