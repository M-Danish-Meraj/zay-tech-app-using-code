import { StateGraph, END } from '@langchain/langgraph';
import { generateImagePrompt, generateImage, generateCaption, composePost } from './nodes.js';

/**
 * LangGraph Workflow for AI Post Generation
 *
 * Flow: generate_prompt → generate_image → generate_caption → compose_post → END
 *
 * State shape:
 * {
 *   userPrompt: string,        // user input
 *   imagePrompt: string,       // LLM-refined image prompt
 *   imageBase64: string|null,  // base64 image (if Gemini Imagen used)
 *   imageMimeType: string|null,
 *   imageUrl: string|null,     // URL (if Pollinations fallback used)
 *   imageSource: string,       // 'gemini' | 'pollinations'
 *   caption: string,           // generated social caption
 *   generationId: string,      // unique id
 *   contactEmail: string,      // from env
 *   companyName: string,       // from env
 *   logoPath: string|null,     // from env
 *   status: string,            // 'pending' | 'complete' | 'error'
 * }
 */

// Build the graph
const workflow = new StateGraph({
  channels: {
    userPrompt: { value: (x, y) => y ?? x, default: () => '' },
    imagePrompt: { value: (x, y) => y ?? x, default: () => '' },
    imageBase64: { value: (x, y) => y ?? x, default: () => null },
    imageMimeType: { value: (x, y) => y ?? x, default: () => null },
    imageUrl: { value: (x, y) => y ?? x, default: () => null },
    imageSource: { value: (x, y) => y ?? x, default: () => '' },
    caption: { value: (x, y) => y ?? x, default: () => '' },
    generationId: { value: (x, y) => y ?? x, default: () => '' },
    contactEmail: { value: (x, y) => y ?? x, default: () => '' },
    companyName: { value: (x, y) => y ?? x, default: () => '' },
    logoBase64: { value: (x, y) => y ?? x, default: () => null },
    logoPath: { value: (x, y) => y ?? x, default: () => null },
    status: { value: (x, y) => y ?? x, default: () => 'pending' },
  }
});

// Add nodes
workflow.addNode('generate_prompt', generateImagePrompt);
workflow.addNode('generate_image', generateImage);
workflow.addNode('generate_caption', generateCaption);
workflow.addNode('compose_post', composePost);

// Define edges (sequential flow)
workflow.setEntryPoint('generate_prompt');
workflow.addEdge('generate_prompt', 'generate_image');
workflow.addEdge('generate_image', 'generate_caption');
workflow.addEdge('generate_caption', 'compose_post');
workflow.addEdge('compose_post', END);

export const postGeneratorGraph = workflow.compile();
