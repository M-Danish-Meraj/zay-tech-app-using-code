import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const templatePath = path.join(__dirname, '..', 'templates', 'reference.png');

// ── Collect all valid API keys from env ──────────────────────────────────────
const ALL_KEYS = [
  process.env.GEMINI_API_KEY_1,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
  // Legacy single-key support
  process.env.GEMINI_API_KEY,
].filter(k => k && k.trim() && !k.includes('your_gemini'));

if (ALL_KEYS.length === 0) {
  console.error('❌ No valid Gemini API keys found. Set GEMINI_API_KEY_1 in .env');
}

// ── Text models to try in order ──────────────────────────────────────────────
const TEXT_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-flash-latest',
];

// ── Image models to try in order ("Nano Banana" series) ──────────────────────
const IMAGE_MODELS = [
  'gemini-3.1-flash-image', // Nano Banana 2
  'gemini-3-pro-image',     // Nano Banana Pro
  'gemini-2.5-flash-image', // Nano Banana
];

// ── Helper: try each key × each model until one works ───────────────────────
async function withFallback(fn) {
  const errors = [];
  for (const apiKey of ALL_KEYS) {
    for (const model of TEXT_MODELS) {
      try {
        console.log(`  [fallback] Trying model=${model} key=...${apiKey.slice(-6)}`);
        return await fn(apiKey, model);
      } catch (err) {
        const msg = err?.message || String(err);
        console.warn(`  [fallback] Failed (${model}): ${msg.slice(0, 100)}`);
        errors.push({ apiKey: apiKey.slice(-6), model, error: msg.slice(0, 120) });
        // Skip remaining models for this key if the key itself is invalid
        if (msg.includes('API_KEY_INVALID') || msg.includes('not valid')) break;
      }
    }
  }
  const summary = errors.map(e => `[key=...${e.apiKey} model=${e.model}] ${e.error}`).join('\n');
  throw new Error(`All API keys/models failed:\n${summary}`);
}

// ── Prompt templates ─────────────────────────────────────────────────────────
const promptRefineTemplate = PromptTemplate.fromTemplate(`
You are an expert AI prompt engineer specializing in high-converting UI/UX promotional posters and marketing graphics.
Task: Translate the user's simple concept into an ultra-detailed text-to-image prompt that generates a complete, structured promotional poster.

User Request: "{userPrompt}"
Company Name: "{companyName}"

INSTRUCTIONS FOR YOU (THE PROMPT ENGINEER):
Analyze the user's request and write a highly detailed image generation prompt. 
If the user specifies text or offers (like "AI agents" or "free hosting"), instruct the image generator to render that specific text beautifully integrated into the design.

Generate a single, highly detailed image generation prompt following these exact specifications:
- **Layout & Composition**: A modern, highly structured social media promotional poster. The composition should look like a professional UI/UX design: a bold centralized headline area at the top, a grid of sleek glassmorphic feature cards in the middle, and a rich, elevated call-to-action banner at the bottom. Leave the extreme top-right empty for an HTML logo overlay.
- **Subject & Visual Elements**: Extract the core theme from the user's request. Include premium 3D tech assets (e.g., floating glowing cloud icons, 3D laptops, isometric server racks, sparkling stars, and vibrant stylized icons inside the feature cards). 
- **Typography & Text Integration**: Instruct the image generator to render prominent, highly legible, professional typography for the main headline and offer badges based on the user's request. Describe the text styling (e.g., bold sans-serif, glowing white text, blue gradient text).
- **Color Palette & Lighting**: A clean, ethereal color palette: bright white and starry light-blue gradient background, frosted glass (glassmorphism) cards, and vibrant electric blue and cyan accents. Bright, airy studio lighting with subtle glowing particle effects.
- **Style & Quality**: Premium 3D vector graphics combined with photorealistic glassmorphism, 8k resolution render, dribbble UI aesthetic, octane render style, ultra-sharp edges, hyper-clean commercial web design graphic.

CRITICAL INSTRUCTIONS: Output ONLY the final raw prompt string. Do not use quotes, markdown formatting, introductory text, or explanations.
`);

const captionTemplate = PromptTemplate.fromTemplate(`
You are an expert social media copywriter for {companyName}.
Create an engaging social media post caption for: "{userPrompt}"

Requirements:
- Start with a powerful hook emoji + headline
- 2-3 short punchy paragraphs
- Include relevant emojis throughout
- End with 5-7 relevant hashtags
- Maximum 280 words
- Tone: professional yet approachable

Return ONLY the caption text, nothing else.
`);

// ── Node 1: Generate refined image prompt ────────────────────────────────────
export async function generateImagePrompt(state) {
  console.log('[Node 1] Refining image prompt...');

  // Check if reference template image exists in binary form
  const hasTemplate = fs.existsSync(templatePath);

  if (hasTemplate) {
    console.log('🖼️ Reference template image detected! Sending image binary to Gemini Vision...');
    try {
      const templateBuffer = fs.readFileSync(templatePath);
      const base64Image = templateBuffer.toString('base64');

      const imagePrompt = await withFallback(async (apiKey, model) => {
        const genAI = new GoogleGenerativeAI(apiKey);
        const visionModel = genAI.getGenerativeModel({ model });

        const formattedInstruction = await promptRefineTemplate.format({
          userPrompt: state.userPrompt,
          companyName: process.env.COMPANY_NAME || 'ZayTech'
        });

        const visionPrompt = `${formattedInstruction}\n\nIMPORTANT ADDITIONAL INSTRUCTION: An attached reference template image has been provided above. Analyze its visual layout, grid arrangement, card structure, and color scheme. Ensure your generated text-to-image prompt closely follows the visual structure and design style of this reference image while adapting to the user's specific request ("${state.userPrompt}").`;

        const result = await visionModel.generateContent([
          {
            inlineData: {
              data: base64Image,
              mimeType: 'image/png'
            }
          },
          visionPrompt
        ]);

        return result.response.text();
      });

      console.log('[Node 1] Vision Image prompt:', imagePrompt.trim());
      return { ...state, imagePrompt: imagePrompt.trim() };
    } catch (err) {
      console.warn('⚠️ Vision prompt generation failed, falling back to text prompt:', err?.message || err);
    }
  }

  const imagePrompt = await withFallback(async (apiKey, model) => {
    const llm = new ChatGoogleGenerativeAI({ model, apiKey, temperature: 0.8 });
    const chain = promptRefineTemplate.pipe(llm).pipe(new StringOutputParser());
    return chain.invoke({ 
      userPrompt: state.userPrompt,
      companyName: process.env.COMPANY_NAME || 'ZayTech'
    });
  });

  console.log('[Node 1] Image prompt:', imagePrompt.trim());
  return { ...state, imagePrompt: imagePrompt.trim() };
}

// ── Node 2: Generate image with OpenAI DALL-E 3 ─────────────────────────────
export async function generateImage(state) {
  console.log('[Node 2] Generating image with OpenAI DALL-E 3...');

  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Clean prompt string to prevent formatting issues
    const cleanPrompt = state.imagePrompt.replace(/[\*\#]/g, '').trim();

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: cleanPrompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard', // or 'hd' for higher crispness
      response_format: 'url', // or 'b64_json' if you prefer base64 data
    });

    const imageUrl = response.data[0].url;

    if (imageUrl) {
      console.log('[Node 2] ✅ OpenAI image generated successfully.');
      return {
        ...state,
        imageUrl: imageUrl,
        imageSource: 'openai',
      };
    }
  } catch (err) {
    console.error('[Node 2] OpenAI image generation failed:', err?.message || err);
  }

  // Fallback: Pollinations AI (FLUX)
  console.log('[Node 2] OpenAI attempt failed — using Pollinations fallback...');
  const seed = Math.floor(Math.random() * 99999);
  const encodedPrompt = encodeURIComponent(
    state.imagePrompt + ', modern tech marketing banner, professional vector design, 8k'
  );

  return {
    ...state,
    imageUrl: `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&seed=${seed}&model=flux`,
    imageSource: 'pollinations',
  };
}

// ── Node 3: Generate caption ─────────────────────────────────────────────────
export async function generateCaption(state) {
  console.log('[Node 3] Generating caption...');

  const caption = await withFallback(async (apiKey, model) => {
    const llm = new ChatGoogleGenerativeAI({ model, apiKey, temperature: 0.8 });
    const chain = captionTemplate.pipe(llm).pipe(new StringOutputParser());
    return chain.invoke({
      userPrompt: state.userPrompt,
      companyName: process.env.COMPANY_NAME || 'ZayTech',
    });
  });

  console.log('[Node 3] Caption generated.');
  return { ...state, caption: caption.trim() };
}

// ── Node 4: Compose final post metadata ─────────────────────────────────────
export async function composePost(state) {
  console.log('[Node 4] Composing final post...');
  const generationId = 'gen_' + Math.random().toString(36).substring(2, 10);

  return {
    ...state,
    generationId,
    contactEmail: process.env.CONTACT_EMAIL || 'zaytech@gmail.com',
    companyName: process.env.COMPANY_NAME || 'ZayTech',
    logoPath: process.env.LOGO_PATH || null,
    status: 'complete',
  };
}
