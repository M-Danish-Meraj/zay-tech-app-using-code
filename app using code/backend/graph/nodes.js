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

// ── Helper: Dynamically collect all valid Gemini API keys from process.env ───
function getGeminiKeys() {
  return [
    process.env.GEMINI_API_KEY_1,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GEMINI_API_KEY,
  ].filter(k => k && typeof k === 'string' && k.trim() && !k.includes('your_gemini'));
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

// ── Helper: try each Gemini key × model, then OpenAI as ultimate LLM fallback
async function withFallback(fn, openAIFallbackPromptBuilder = null) {
  const errors = [];
  const geminiKeys = getGeminiKeys();

  for (const apiKey of geminiKeys) {
    for (const model of TEXT_MODELS) {
      try {
        console.log(`  [fallback] Trying model=${model} key=...${apiKey.slice(-6)}`);
        return await fn(apiKey, model);
      } catch (err) {
        const msg = err?.message || String(err);
        console.warn(`  [fallback] Gemini failed (${model}): ${msg.slice(0, 100)}`);
        errors.push({ apiKey: apiKey.slice(-6), model, error: msg.slice(0, 120) });
        if (msg.includes('API_KEY_INVALID') || msg.includes('not valid')) break;
      }
    }
  }

  // Fallback to OpenAI text model if configured
  const openAIKey = process.env.OPENAI_API_KEY;
  if (openAIKey && !openAIKey.includes('your_') && openAIFallbackPromptBuilder) {
    try {
      console.log('  [fallback] Trying OpenAI gpt-4o-mini text fallback...');
      const openai = new OpenAI({ apiKey: openAIKey });
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: openAIFallbackPromptBuilder() }],
        temperature: 0.7,
      });
      const text = response.choices?.[0]?.message?.content;
      if (text) {
        console.log('  [fallback] ✅ OpenAI text fallback succeeded.');
        return text;
      }
    } catch (openAiErr) {
      console.warn('  [fallback] OpenAI text fallback failed:', openAiErr?.message || openAiErr);
    }
  }

  const summary = errors.map(e => `[key=...${e.apiKey} model=${e.model}] ${e.error}`).join('\n');
  throw new Error(`All Gemini API keys/models failed:\n${summary}`);
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

        const visionPayload = [];
        
        // Attach reference template if present
        if (hasTemplate) {
          const templateBuffer = fs.readFileSync(templatePath);
          visionPayload.push({
            inlineData: { data: templateBuffer.toString('base64'), mimeType: 'image/png' }
          });
        }

        // Attach company logo binary if present
        if (state.logoBase64 && typeof state.logoBase64 === 'string') {
          const cleanLogo = state.logoBase64.replace(/^data:image\/\w+;base64,/, '');
          visionPayload.push({
            inlineData: { data: cleanLogo, mimeType: 'image/png' }
          });
        }

        const visionPrompt = `${formattedInstruction}\n\nIMPORTANT ADDITIONAL INSTRUCTION: Attached binary reference image(s)/logo have been provided above. Analyze the visual elements, brand styling, color scheme, and layout. Ensure your generated text-to-image prompt closely follows the visual structure and brand style while adapting to the user's specific request ("${state.userPrompt}").`;
        visionPayload.push(visionPrompt);

        const result = await visionModel.generateContent(visionPayload);
        return result.response.text();
      });

      console.log('[Node 1] Vision Image prompt:', imagePrompt.trim());
      return { ...state, imagePrompt: imagePrompt.trim() };
    } catch (err) {
      console.warn('⚠️ Vision prompt generation failed, falling back to text prompt:', err?.message || err);
    }
  }

  const imagePrompt = await withFallback(
    async (apiKey, model) => {
      const llm = new ChatGoogleGenerativeAI({ model, apiKey, temperature: 0.8 });
      const chain = promptRefineTemplate.pipe(llm).pipe(new StringOutputParser());
      return chain.invoke({ 
        userPrompt: state.userPrompt,
        companyName: process.env.COMPANY_NAME || 'ZayTech'
      });
    },
    () => `You are an expert AI prompt engineer. Translate this concept into an ultra-detailed text-to-image prompt for a high-converting promotional graphic banner for ${process.env.COMPANY_NAME || 'ZayTech'}.\nUser Request: "${state.userPrompt}"\nOutput ONLY the final raw prompt string.`
  );

  console.log('[Node 1] Image prompt:', imagePrompt.trim());
  return { ...state, imagePrompt: imagePrompt.trim() };
}

// ── Node 2: Generate image (OpenAI DALL-E 3 -> Gemini Imagen -> Pollinations) ─────────
export async function generateImage(state) {
  console.log('[Node 2] Generating image...');
  const cleanPrompt = (state.imagePrompt || state.userPrompt || '').replace(/[\*\#]/g, '').trim();

  // Attempt 1: OpenAI DALL-E 3 if OPENAI_API_KEY is configured
  const openAIKey = process.env.OPENAI_API_KEY;
  if (openAIKey && !openAIKey.includes('your_')) {
    try {
      console.log('[Node 2] Attempt 1: Generating image with OpenAI DALL-E 3...');
      const openai = new OpenAI({ apiKey: openAIKey });
      const response = await openai.images.generate({
        model: 'dall-e-3',
        prompt: cleanPrompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
        response_format: 'url',
      });
      const imageUrl = response.data?.[0]?.url;
      if (imageUrl) {
        console.log('[Node 2] ✅ OpenAI image generated successfully.');
        return { ...state, imageUrl, imageSource: 'openai' };
      }
    } catch (err) {
      console.warn('[Node 2] OpenAI DALL-E 3 attempt failed:', err?.message || err);
    }
  }

  // Attempt 2: Gemini Image Generation / Imagen if Gemini keys are configured
  const geminiKeys = getGeminiKeys();
  if (geminiKeys.length > 0) {
    for (const apiKey of geminiKeys) {
      for (const modelName of IMAGE_MODELS) {
        try {
          console.log(`[Node 2] Attempt 2: Generating image with Gemini model=${modelName}...`);
          const genAI = new GoogleGenerativeAI(apiKey);
          const imageModel = genAI.getGenerativeModel({ model: modelName });
          const result = await imageModel.generateContent([cleanPrompt]);
          const parts = result.response.candidates?.[0]?.content?.parts || [];
          const imagePart = parts.find(p => p.inlineData?.mimeType?.startsWith('image/'));
          if (imagePart) {
            console.log(`[Node 2] ✅ Gemini image generated using ${modelName}.`);
            return {
              ...state,
              imageBase64: imagePart.inlineData.data,
              imageMimeType: imagePart.inlineData.mimeType,
              imageSource: 'gemini',
            };
          }
        } catch (err) {
          console.warn(`[Node 2] Gemini image gen failed (${modelName}):`, err?.message?.slice(0, 100));
        }
      }
    }
  }

  // Attempt 3: Pollinations AI (FLUX) - Guaranteed free fallback
  console.log('[Node 2] Attempt 3: Using Pollinations AI FLUX fallback...');
  const seed = Math.floor(Math.random() * 99999);
  const encodedPrompt = encodeURIComponent(
    cleanPrompt + ', modern tech marketing banner, professional vector design, 8k'
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

  const caption = await withFallback(
    async (apiKey, model) => {
      const llm = new ChatGoogleGenerativeAI({ model, apiKey, temperature: 0.8 });
      const chain = captionTemplate.pipe(llm).pipe(new StringOutputParser());
      return chain.invoke({
        userPrompt: state.userPrompt,
        companyName: process.env.COMPANY_NAME || 'ZayTech',
      });
    },
    () => `You are an expert social media copywriter for ${process.env.COMPANY_NAME || 'ZayTech'}. Create an engaging social media caption for: "${state.userPrompt}". Include emojis and hashtags.`
  );

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
