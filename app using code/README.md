# ZayTech AI Post Generator — PWA

A **Progressive Web App** that uses **LangChain + LangGraph + Gemini API** to generate social media posts with AI images and captions.

## Architecture

```
app using code/
├── backend/              ← Node.js Express server
│   ├── server.js         ← API routes + serves frontend
│   ├── .env              ← Gemini API key + branding config
│   ├── graph/
│   │   ├── nodes.js      ← LangGraph node functions (LangChain)
│   │   └── workflow.js   ← LangGraph StateGraph
│   └── package.json
└── frontend/             ← PWA (served by backend)
    ├── index.html
    ├── manifest.json     ← PWA installable
    ├── service-worker.js ← Offline support
    ├── styles/app.css
    └── scripts/app.js
```

## LangGraph Workflow (4 Nodes)

```
generate_prompt → generate_image → generate_caption → compose_post → END
```

| Node | What it does |
|------|-------------|
| `generate_prompt` | Gemini refines user input into a rich image prompt |
| `generate_image` | Gemini Imagen generates image (falls back to Pollinations AI) |
| `generate_caption` | Gemini writes an engaging marketing caption |
| `compose_post` | Assembles final result with branding config |

## Post Template

- **Logo**: top-right overlay
- **Gmail/Contact**: center-bottom gradient overlay

## Setup

### 1. Backend

```bash
cd "app using code/backend"
npm install
```

Edit `.env`:
```
GEMINI_API_KEY=your_actual_api_key_here
CONTACT_EMAIL=your@gmail.com
LOGO_PATH=./assets/logo.png    # path to your logo file
COMPANY_NAME=ZayTech
```

### 2. Run

```bash
cd "app using code/backend"
npm run dev
```

Open **http://localhost:3001** in your browser.

## PWA Installation

When you open the app in Chrome, you'll see an **"Install App"** banner. Click it to install ZayTech AI as a desktop/mobile app.

## Switching to OpenAI in Future

In `backend/graph/nodes.js`, replace:
```js
// FROM:
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
export const llm = new ChatGoogleGenerativeAI({ model: 'gemini-2.0-flash', ... });

// TO:
import { ChatOpenAI } from '@langchain/openai';
export const llm = new ChatOpenAI({ model: 'gpt-4o', apiKey: process.env.OPENAI_API_KEY });
```
