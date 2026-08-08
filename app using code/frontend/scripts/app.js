/* ── Config ────────────────────────────────────────────────────────────────── */
const API_BASE = `${window.location.origin}/api`;

/* ── State ─────────────────────────────────────────────────────────────────── */
let currentGeneration = null;
let deferredInstallPrompt = null;

/* ── DOM References ─────────────────────────────────────────────────────────── */
const sections = {
  generator: document.getElementById('section-generator'),
  loading:   document.getElementById('section-loading'),
  result:    document.getElementById('section-result'),
  history:   document.getElementById('section-history'),
};

const promptInput   = document.getElementById('prompt-input');
const charCount     = document.getElementById('char-count');
const btnGenerate   = document.getElementById('btn-generate');
const btnHistory    = document.getElementById('btn-history');
const btnApprove    = document.getElementById('btn-approve');
const btnReject     = document.getElementById('btn-reject');
const btnRegen      = document.getElementById('btn-regen');
const btnCopyCaption = document.getElementById('btn-copy-caption');
const btnStartOver  = document.getElementById('btn-start-over');
const btnBackHistory = document.getElementById('btn-back-history');
const installBanner = document.getElementById('install-banner');
const btnInstall    = document.getElementById('btn-install');
const btnDismiss    = document.getElementById('btn-dismiss');
const toastContainer = document.getElementById('toast-container');

// Loading steps
const steps = [
  document.getElementById('step-1'),
  document.getElementById('step-2'),
  document.getElementById('step-3'),
  document.getElementById('step-4'),
];
const loadingMsg = document.getElementById('loading-msg');

/* ── Section Navigation ─────────────────────────────────────────────────────── */
function showSection(name) {
  Object.values(sections).forEach(s => s.classList.remove('active'));
  sections[name].classList.add('active');
}

/* ── Toast ─────────────────────────────────────────────────────────────────── */
function toast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = (type === 'success' ? '✨ ' : '⚠️ ') + msg;
  toastContainer.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

/* ── Character Counter ─────────────────────────────────────────────────────── */
promptInput.addEventListener('input', () => {
  const len = promptInput.value.length;
  charCount.textContent = `${len} / 300`;
  charCount.style.color = len > 280 ? '#ef4444' : '#64748b';
});

/* ── Loading Step Animation ─────────────────────────────────────────────────── */
let stepInterval = null;
function startLoadingAnimation() {
  const msgs = [
    '🧠 Gemini is understanding your request...',
    '🎨 Crafting the perfect image prompt...',
    '⚡ Generating AI image...',
    '✍️ Writing your social caption...',
  ];
  let i = 0;
  steps.forEach(s => { s.className = 'loading-step'; });
  steps[0].classList.add('active');
  loadingMsg.textContent = msgs[0];

  stepInterval = setInterval(() => {
    if (i < steps.length - 1) {
      steps[i].classList.remove('active');
      steps[i].classList.add('done');
      i++;
      steps[i].classList.add('active');
      loadingMsg.textContent = msgs[i];
    }
  }, 5000);
}
function stopLoadingAnimation() {
  clearInterval(stepInterval);
  steps.forEach(s => s.classList.add('done'));
}

/* ── Generate Post ─────────────────────────────────────────────────────────── */
async function handleGenerate() {
  const prompt = promptInput.value.trim();
  if (prompt.length < 5) {
    toast('Please enter at least 5 characters.', 'error');
    return;
  }

  showSection('loading');
  startLoadingAnimation();
  btnGenerate.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Generation failed');

    stopLoadingAnimation();
    currentGeneration = data;
    renderResult(data);
    showSection('result');
    toast('Post generated successfully!');
  } catch (err) {
    stopLoadingAnimation();
    console.error(err);
    toast(err.message || 'Generation failed. Please try again.', 'error');
    showSection('generator');
    btnGenerate.disabled = false;
  }
}

/* ── Render Result ─────────────────────────────────────────────────────────── */
function renderResult(data) {
  // Image
  const img = document.getElementById('result-image');
  const container = img.closest('.post-canvas-container');

  // Remove any old placeholder
  const oldPlaceholder = container.querySelector('.img-placeholder');
  if (oldPlaceholder) oldPlaceholder.remove();

  // Show a loading shimmer while the image loads
  const placeholder = document.createElement('div');
  placeholder.className = 'img-placeholder';
  placeholder.innerHTML = `
    <div class="img-placeholder-inner">
      <div class="img-loading-ring"></div>
      <p>Loading image...</p>
    </div>`;
  container.appendChild(placeholder);

  img.style.opacity = '0';
  img.alt = `AI generated post for: ${data.prompt || data.userPrompt || 'your post'}`;

  const onLoad = () => {
    placeholder.remove();
    img.style.transition = 'opacity 0.4s ease';
    img.style.opacity = '1';
  };

  const onError = () => {
    placeholder.innerHTML = `
      <div class="img-placeholder-inner">
        <span style="font-size:2rem">🖼️</span>
        <p style="color:#f87171">Image failed to load.<br>Try regenerating.</p>
      </div>`;
    img.style.opacity = '0';
  };

  img.onload = onLoad;
  img.onerror = onError;

  if (data.imageBase64) {
    img.src = `data:${data.imageMimeType || 'image/png'};base64,${data.imageBase64}`;
  } else if (data.imageUrl) {
    // Add a cache-buster so the browser definitely re-fetches
    img.src = data.imageUrl + (data.imageUrl.includes('?') ? '&_t=' : '?_t=') + Date.now();
  } else {
    onError();
  }

  // Logo overlay — always serve from frontend assets
  const logoEl = document.getElementById('overlay-logo-img');
  const logoText = document.getElementById('overlay-logo-text');
  logoText.textContent = data.companyName || 'ZayTech';
  logoEl.src = '/assets/icons/logo.jpeg';
  logoEl.style.display = 'block';

  // Email overlay
  document.getElementById('overlay-email-text').textContent =
    data.contactEmail || 'zaytech@gmail.com';

  // Image badge
  document.getElementById('image-badge-text').textContent =
    data.generationId ? `ID: ${data.generationId.slice(0,14)}` : '';

  // Caption
  document.getElementById('caption-text').textContent = data.caption || '';
}

/* ── Approve ────────────────────────────────────────────────────────────────── */
async function handleApprove() {
  if (!currentGeneration) return;
  btnApprove.disabled = true;
  try {
    await fetch(`${API_BASE}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        generationId: currentGeneration.generationId,
        caption: currentGeneration.caption,
        imageUrl: currentGeneration.imageUrl,
        imageBase64: currentGeneration.imageBase64,
      }),
    });
    toast('Post approved and saved! 🎉');
    resetGenerator();
  } catch (err) {
    toast('Approval failed. Please try again.', 'error');
  } finally {
    btnApprove.disabled = false;
  }
}

/* ── Reject ─────────────────────────────────────────────────────────────────── */
async function handleReject() {
  if (!currentGeneration) return;
  try {
    await fetch(`${API_BASE}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ generationId: currentGeneration.generationId }),
    });
  } catch {}
  toast('Post rejected.', 'error');
  resetGenerator();
}

/* ── Regenerate ─────────────────────────────────────────────────────────────── */
async function handleRegen() {
  const prompt = currentGeneration?.prompt || promptInput.value.trim();
  promptInput.value = prompt;
  currentGeneration = null;
  await handleGenerate();
}

/* ── Copy Caption ───────────────────────────────────────────────────────────── */
function handleCopyCaption() {
  const caption = document.getElementById('caption-text').textContent;
  navigator.clipboard.writeText(caption).then(() => toast('Caption copied!')).catch(() => toast('Copy failed', 'error'));
}

/* ── Reset ──────────────────────────────────────────────────────────────────── */
function resetGenerator() {
  currentGeneration = null;
  promptInput.value = '';
  charCount.textContent = '0 / 300';
  btnGenerate.disabled = false;
  showSection('generator');
}

/* ── History ────────────────────────────────────────────────────────────────── */
async function showHistory() {
  showSection('history');
  const grid = document.getElementById('history-grid');
  grid.innerHTML = '<p class="text-muted text-center" style="padding:24px">Loading...</p>';

  try {
    const res = await fetch(`${API_BASE}/history`);
    const data = await res.json();
    const posts = data.posts || [];

    if (posts.length === 0) {
      grid.innerHTML = `
        <div class="history-empty">
          <div class="empty-icon">📭</div>
          <p>No approved posts yet.</p>
          <p style="margin-top:8px;font-size:12px;">Generate and approve a post to see it here.</p>
        </div>`;
      return;
    }

    grid.innerHTML = posts.map(p => `
      <div class="history-card">
        ${p.imageUrl || p.imageBase64 ? `<img src="${p.imageBase64 ? `data:image/png;base64,${p.imageBase64}` : p.imageUrl}" alt="Post image" loading="lazy">` : ''}
        <div class="history-card-body">
          <div class="caption-label">Caption</div>
          <div class="history-caption">${p.caption || ''}</div>
          <div class="history-meta">
            <span class="status-badge">✓ ${p.status}</span>
            <span>${new Date(p.approvedAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    `).join('');
  } catch {
    grid.innerHTML = '<p class="text-muted text-center" style="padding:24px">Failed to load history.</p>';
  }
}

/* ── Template Reference Management ──────────────────────────────────────────── */
const templateFileInput = document.getElementById('template-file-input');
const templatePreviewContainer = document.getElementById('template-preview-container');
const templatePreviewImg = document.getElementById('template-preview-img');
const btnDeleteTemplate = document.getElementById('btn-delete-template');
const templateStatusBadge = document.getElementById('template-status-badge');
const btnDownload = document.getElementById('btn-download');

async function checkTemplate() {
  try {
    const res = await fetch(`${API_BASE}/template`);
    const data = await res.json();
    if (data.exists) {
      templatePreviewImg.src = data.url;
      templatePreviewContainer.style.display = 'flex';
      templateStatusBadge.textContent = '✓ Active Template';
      templateStatusBadge.classList.add('active');
    } else {
      templatePreviewContainer.style.display = 'none';
      templateStatusBadge.textContent = 'No template set';
      templateStatusBadge.classList.remove('active');
    }
  } catch (err) {
    console.error('Failed to check template:', err);
  }
}

templateFileInput?.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async () => {
    const base64 = reader.result;
    try {
      const res = await fetch(`${API_BASE}/template/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64 })
      });
      const data = await res.json();
      if (data.success) {
        toast('Reference template uploaded successfully!');
        checkTemplate();
      } else {
        toast(data.error || 'Failed to upload template', 'error');
      }
    } catch (err) {
      toast('Failed to upload template image', 'error');
    }
  };
  reader.readAsDataURL(file);
});

btnDeleteTemplate?.addEventListener('click', async () => {
  try {
    const res = await fetch(`${API_BASE}/template`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      toast('Reference template deleted');
      templateFileInput.value = '';
      checkTemplate();
    }
  } catch (err) {
    toast('Failed to delete template', 'error');
  }
});

/* ── Image Composite Download ────────────────────────────────────────────────── */
async function handleDownloadImage() {
  const imgEl = document.getElementById('result-image');
  if (!imgEl || !imgEl.src) {
    toast('No image available to download.', 'error');
    return;
  }

  toast('Preparing image download...');

  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const width = 1024;
    const height = 1024;
    canvas.width = width;
    canvas.height = height;

    // Load main post image
    const mainImg = new Image();
    mainImg.crossOrigin = 'anonymous';
    
    await new Promise((resolve, reject) => {
      mainImg.onload = resolve;
      mainImg.onerror = reject;
      mainImg.src = imgEl.src;
    });

    // Draw main image
    ctx.drawImage(mainImg, 0, 0, width, height);

    // Render Branding Overlays on Canvas
    // Top-Right Logo Badge
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.beginPath();
    ctx.roundRect(width - 180, 24, 156, 44, 12);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ZayTech', width - 102, 46);

    // Top-Left ID Badge
    const badgeText = document.getElementById('image-badge-text')?.textContent || 'ZayTech AI';
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.beginPath();
    ctx.roundRect(24, 24, 140, 36, 10);
    ctx.fill();
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(badgeText, 94, 42);

    // Bottom Email Bar
    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.fillRect(0, height - 60, width, 60);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 18px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('zaytech@gmail.com', width / 2, height - 28);

    // Trigger Download
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `zaytech-post-${currentGeneration?.generationId || Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast('Image saved to device! 💾');
  } catch (err) {
    console.error('Download error:', err);
    // Fallback: direct download of image src
    const a = document.createElement('a');
    a.href = imgEl.src;
    a.download = `zaytech-post-${Date.now()}.png`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast('Downloaded main image!');
  }
}

/* ── Event Listeners ────────────────────────────────────────────────────────── */
btnGenerate.addEventListener('click', handleGenerate);
promptInput.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'Enter') handleGenerate();
});
btnApprove.addEventListener('click', handleApprove);
btnReject.addEventListener('click', handleReject);
btnRegen.addEventListener('click', handleRegen);
btnCopyCaption.addEventListener('click', handleCopyCaption);
btnDownload?.addEventListener('click', handleDownloadImage);
btnStartOver.addEventListener('click', resetGenerator);
btnHistory.addEventListener('click', showHistory);
btnBackHistory.addEventListener('click', resetGenerator);

// Initial template check
checkTemplate();

/* ── PWA Install Prompt ─────────────────────────────────────────────────────── */
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  installBanner.classList.add('visible');
});
btnInstall?.addEventListener('click', async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  const { outcome } = await deferredInstallPrompt.userChoice;
  if (outcome === 'accepted') toast('App installed! 📱');
  deferredInstallPrompt = null;
  installBanner.classList.remove('visible');
});
btnDismiss?.addEventListener('click', () => installBanner.classList.remove('visible'));

/* ── Service Worker Registration ─────────────────────────────────────────────── */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(() => console.log('[SW] Registered'))
      .catch(err => console.error('[SW] Error:', err));
  });
}
