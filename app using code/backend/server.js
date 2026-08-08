import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { postGeneratorGraph } from './graph/workflow.js';
import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '20mb' }));

// Serve frontend PWA static files
const frontendDir = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendDir));

// ── API: Health Check ─────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    model: 'gemini-2.0-flash',
    company: process.env.COMPANY_NAME || 'ZayTech',
    timestamp: new Date().toISOString()
  });
});

// ── In-memory store for approved posts ───────────────────────────────────────
const approvedPosts = [];
const activeGenerations = new Map();

// ── API: Generate Post (LangGraph workflow) ───────────────────────────────────
app.post('/api/generate', async (req, res) => {
  const { prompt } = req.body;

  if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 3) {
    return res.status(400).json({ error: 'Prompt must be at least 3 characters.' });
  }

  console.log(`\n🚀 Starting LangGraph workflow for: "${prompt}"`);

  try {
    const finalState = await postGeneratorGraph.invoke({
      userPrompt: prompt.trim(),
    });

    const result = {
      success: true,
      generationId: finalState.generationId,
      imageUrl: finalState.imageUrl || null,
      imageBase64: finalState.imageBase64 || null,
      imageMimeType: finalState.imageMimeType || null,
      imageSource: finalState.imageSource,
      caption: finalState.caption,
      contactEmail: finalState.contactEmail,
      companyName: finalState.companyName,
      logoPath: finalState.logoPath,
      prompt: finalState.userPrompt,
      imagePrompt: finalState.imagePrompt,
    };

    activeGenerations.set(finalState.generationId, result);
    console.log(`✅ Generation complete: ${finalState.generationId}`);
    return res.json(result);

  } catch (err) {
    console.error('❌ LangGraph workflow error:', err);
    return res.status(500).json({
      error: err.message || 'Generation failed. Please try again.'
    });
  }
});

// ── API: Approve Post ─────────────────────────────────────────────────────────
app.post('/api/approve', (req, res) => {
  const { generationId, caption, imageUrl, imageBase64 } = req.body;
  if (!generationId) return res.status(400).json({ error: 'generationId required' });

  const post = {
    id: generationId,
    caption,
    imageUrl,
    imageBase64: imageBase64 || null,
    approvedAt: new Date().toISOString(),
    status: 'Approved'
  };
  approvedPosts.unshift(post);
  activeGenerations.delete(generationId);

  console.log(`✅ Post approved: ${generationId}`);
  res.json({ success: true, message: 'Post approved successfully!' });
});

// ── API: Reject Post ──────────────────────────────────────────────────────────
app.post('/api/reject', (req, res) => {
  const { generationId } = req.body;
  if (generationId) activeGenerations.delete(generationId);
  console.log(`❌ Post rejected: ${generationId}`);
  res.json({ success: true, message: 'Post rejected.' });
});

// ── API: Get Approved History ─────────────────────────────────────────────────
app.get('/api/history', (req, res) => {
  res.json({ posts: approvedPosts });
});

// ── API: Template Image Management ──────────────────────────────────────────
const templatesDir = path.join(__dirname, 'templates');
if (!fs.existsSync(templatesDir)) {
  fs.mkdirSync(templatesDir, { recursive: true });
}
app.use('/templates', express.static(templatesDir));

// Upload template image
app.post('/api/template/upload', (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) return res.status(400).json({ error: 'imageBase64 required' });

    // Clean base64 data header
    const cleanData = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(cleanData, 'base64');
    const filePath = path.join(templatesDir, 'reference.png');

    fs.writeFileSync(filePath, buffer);
    console.log('✅ Template image uploaded to templates/reference.png');
    return res.json({ success: true, message: 'Template saved successfully', url: '/templates/reference.png' });
  } catch (err) {
    console.error('❌ Failed to save template image:', err);
    return res.status(500).json({ error: 'Failed to save template image' });
  }
});

// Check/Get active template image
app.get('/api/template', (req, res) => {
  const filePath = path.join(templatesDir, 'reference.png');
  if (fs.existsSync(filePath)) {
    return res.json({ exists: true, url: `/templates/reference.png?t=${Date.now()}` });
  } else {
    return res.json({ exists: false });
  }
});

// Delete template image
app.delete('/api/template', (req, res) => {
  try {
    const filePath = path.join(templatesDir, 'reference.png');
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('🗑️ Template image deleted.');
    }
    return res.json({ success: true, message: 'Template deleted successfully' });
  } catch (err) {
    console.error('❌ Failed to delete template:', err);
    return res.status(500).json({ error: 'Failed to delete template' });
  }
});

// ── Catch-all: serve PWA index.html for SPA routing ──────────────────────────
app.get('*', (req, res) => {
  const indexPath = path.join(frontendDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ error: 'Frontend not found' });
  }
});

const HOST = '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`\n🌐 ZayTech AI Post Generator running on http://localhost:${PORT}`);
  console.log(`📡 Local Network Access: http://0.0.0.0:${PORT}`);
  console.log(`📧 Contact: ${process.env.CONTACT_EMAIL}`);
  console.log(`🤖 Model: Gemini 2.0 Flash (LangChain + LangGraph)\n`);
});
