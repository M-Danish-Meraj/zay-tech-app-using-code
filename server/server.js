const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const { jsPDF } = require('jspdf');
const docx = require('docx');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate Limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests from this IP, please try again later.' }
});
app.use('/api/', limiter);

// Serve static mock assets
const publicDir = path.join(__dirname, 'public');
const mockImagesDir = path.join(publicDir, 'mock-images');
if (!fs.existsSync(mockImagesDir)) {
  fs.mkdirSync(mockImagesDir, { recursive: true });
}

// In-memory store
const mockDatabase = {
  activeGenerations: new Map(),
  approvedPosts: [
    {
      id: '001',
      imageName: 'cyberpunk-neon-deal.png',
      imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
      caption: '🚀 Elevate your brand to the stars! Check out our futuristic web design templates today. ✨ #WebDesign #Futuristic #AgencyLife',
      status: 'Approved',
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '002',
      imageName: 'pastel-galaxy-sale.png',
      imageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop&q=80',
      caption: '🌸 Introducing our brand new pastel theme pack. Cosmic vibes, clean layouts, and seamless animations. Get 20% off this week! 🌌',
      status: 'Approved',
      createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
    }
  ]
};

app.use(express.static(publicDir));

// Helper: Check if mock mode is active
const isMockMode = () => {
  return process.env.ENABLE_MOCK_MODE === 'true' || !process.env.N8N_GENERATE_WEBHOOK_URL;
};

// API: Check status of API / Webhook connections
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: isMockMode() ? 'MOCK_MODE_FALLBACK' : 'PRODUCTION_N8N',
    timestamp: new Date().toISOString()
  });
});

// API: Generate Post
app.post('/api/generate', async (req, res) => {
  const { prompt } = req.body;

  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
    return res.status(400).json({ error: 'Prompt is required.' });
  }

  if (isMockMode()) {
    const generationId = 'gen_' + Math.random().toString(36).substring(2, 9);
    const images = [
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop&q=80'
    ];

    const selectedImage = images[Math.floor(Math.random() * images.length)];

    const result = {
      success: true,
      generationId,
      imageUrl: selectedImage,
      imageName: `social-post-${generationId}.png`,
      caption: `✨ Brand New Creation ✨\n\nInspired by your request: "${prompt}"`
    };

    mockDatabase.activeGenerations.set(generationId, result);
    return res.json(result);
  }

  try {
    const response = await axios.post(
      process.env.N8N_GENERATE_WEBHOOK_URL,
      { prompt }
    );

    console.log("========== N8N RESPONSE ==========");
    console.log(JSON.stringify(response.data, null, 2));
    console.log("==================================");

    return res.json(response.data);

  } catch (error) {
    console.error("n8n generate error:", error.message);

    return res.status(502).json({
      error: "We couldn't generate your post. Please try again."
    });
  }
});
// API: Approve Post
app.post('/api/approve', async (req, res) => {
  const { resumeUrl, generationId, imageUrl, imageName, caption } = req.body;

  if (isMockMode()) {
    // ... mock mode code stays the same ...
  }

  try {
    // Fallback safely to env variable if resumeUrl is missing or invalid
    let targetUrl = process.env.N8N_APPROVE_WEBHOOK_URL;
    if (resumeUrl && typeof resumeUrl === 'string' && resumeUrl.startsWith('http')) {
      targetUrl = resumeUrl.includes('?') ? `${resumeUrl}&action=approve` : `${resumeUrl}?action=approve`;
    }

    await axios.post(targetUrl, {
      generationId,
      imageUrl,
      imageName,
      caption,
      action: 'approve'
    });
    res.json({ success: true });
  } catch (error) {
    console.error('n8n approve error:', error.message);
    res.status(502).json({ error: 'Your post could not be approved. Please try again.' });
  }
});

// API: Reject & Regenerate Post
app.post('/api/reject', async (req, res) => {
  const { resumeUrl, generationId } = req.body;

  if (isMockMode()) {
    // ... mock mode code stays the same ...
  }

  try {
    // Fallback safely to env variable if resumeUrl is missing or invalid
    let targetUrl = process.env.N8N_REJECT_WEBHOOK_URL;
    if (resumeUrl && typeof resumeUrl === 'string' && resumeUrl.startsWith('http')) {
      targetUrl = resumeUrl.includes('?') ? `${resumeUrl}&action=reject` : `${resumeUrl}?action=reject`;
    }

    const response = await axios.post(targetUrl, { 
      generationId,
      action: 'reject'
    });
    res.json(response.data);
  } catch (error) {
    console.error('n8n reject error:', error.message);
    res.status(502).json({ error: 'Regeneration failed. Please try again.' });
  }
}),

// API: Download PDF
app.all('/api/download/pdf', async (req, res) => {
  const { imageName, imageUrl, caption, createdAt } = req.method === 'POST' ? req.body : req.query;

  try {
    const doc = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4'
    });

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 40, 'F');

    doc.setTextColor(244, 114, 182);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('AI SOCIAL POST STUDIO', 15, 20);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated Content Report - ${imageName || 'post.png'}`, 15, 28);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(12);

    doc.setFont('helvetica', 'bold');
    doc.text('Details:', 15, 55);
    doc.setFont('helvetica', 'normal');
    doc.text(`Filename: ${imageName || 'N/A'}`, 15, 62);
    doc.text(`Created Date: ${createdAt ? new Date(createdAt).toLocaleString() : new Date().toLocaleString()}`, 15, 69);

    doc.setFont('helvetica', 'bold');
    doc.text('Social Media Caption:', 15, 80);
    doc.setFont('helvetica', 'normal');
    const splitCaption = doc.splitTextToSize(caption || '', 180);
    doc.text(splitCaption, 15, 87);

    let imageY = 87 + (splitCaption.length * 6) + 10;
    if (imageUrl) {
      const buffer = await fetchImageBuffer(imageUrl);
      const base64Image = buffer.toString('base64');
      const format = imageName?.endsWith('.png') ? 'PNG' : 'JPEG';
      try {
        doc.addImage(base64Image, format, 15, imageY, 120, 67.5);
      } catch (err) {
        console.error('Failed to add image to PDF:', err.message);
        doc.text('[Image unavailable in report]', 15, imageY);
      }
    }

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${imageName ? imageName.replace(/\.[^/.]+$/, "") : "post"}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('PDF generation error:', err);
    res.status(500).json({ error: 'Failed to generate PDF document.' });
  }
});

// API: Download Word DOCX
app.all('/api/download/docx', async (req, res) => {
  const { imageName, imageUrl, caption, createdAt } = req.method === 'POST' ? req.body : req.query;

  try {
    const buffer = await fetchImageBuffer(imageUrl);
    const dateText = createdAt ? new Date(createdAt).toLocaleString() : new Date().toLocaleString();

    const children = [
      new docx.Paragraph({
        children: [
          new docx.TextRun({
            text: "AI Social Post Studio Content",
            bold: true,
            size: 32,
            color: "EC4899",
          }),
        ],
      }),
      new docx.Paragraph({
        text: `Exported on: ${dateText}`,
        spacing: { after: 300 },
      }),
      new docx.Paragraph({
        children: [
          new docx.TextRun({
            text: "Filename: ",
            bold: true,
          }),
          new docx.TextRun({
            text: imageName || 'social-post.png',
          }),
        ],
        spacing: { after: 200 },
      }),
      new docx.Paragraph({
        children: [
          new docx.TextRun({
            text: "Caption Content:",
            bold: true,
            size: 24,
          }),
        ],
        spacing: { after: 120 },
      }),
      new docx.Paragraph({
        text: caption || '',
        spacing: { after: 300 },
      }),
    ];

    try {
      const docxImage = new docx.ImageRun({
        data: buffer,
        transformation: {
          width: 500,
          height: 281.25,
        },
      });
      children.push(
        new docx.Paragraph({
          children: [
            new docx.TextRun({
              text: "Generated Media Visual:",
              bold: true,
              size: 24,
            }),
          ],
          spacing: { after: 120 },
        }),
        new docx.Paragraph({
          children: [docxImage],
        })
      );
    } catch (imgErr) {
      console.error('Failed to bundle image in Word DOCX:', imgErr.message);
      children.push(
        new docx.Paragraph({
          text: "[Visual asset could not be attached directly to document]",
        })
      );
    }

    const doc = new docx.Document({
      sections: [
        {
          properties: {},
          children: children,
        },
      ],
    });

    const docxBuffer = await docx.Packer.toBuffer(doc);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${imageName ? imageName.replace(/\.[^/.]+$/, "") : "post"}.docx"`);
    res.send(docxBuffer);
  } catch (err) {
    console.error('Word generation error:', err);
    res.status(500).json({ error: 'Failed to generate Word document.' });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log('--- ENV CHECK ---');
  console.log('ENABLE_MOCK_MODE:', process.env.ENABLE_MOCK_MODE);
  console.log('GENERATE:', process.env.N8N_GENERATE_WEBHOOK_URL);
  console.log('-----------------');
});