# AI Social Post Studio (Expo Mobile App & Node.js + n8n)

An elegant, cross-platform mobile application designed as a social media post and image generation interface connected to your n8n automation workflow. The application features a premium Blue and Pink Space Nebula theme with cosmic glassmorphism.

## Architecture

```
                    USER
                     │
                     ▼
             EXPO MOBILE APP (iOS / Android)
                     │
                     ▼
              NODE.JS BACKEND (Express)
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
     GENERATE      APPROVE      REJECT
      WEBHOOK      WEBHOOK      WEBHOOK
        │            │            │
        └────────────┼────────────┘
                     ▼
                    N8N
                     │
        ┌────────────┼─────────────┐
        │            │             │
        ▼            ▼             ▼
       AI          DRIVE       GOOGLE SHEETS
    GENERATION     STORAGE       DATABASE
        │                           │
        ▼                           ▼
 IMAGE + CAPTION             FINAL APPROVED POSTS
        │                           │
        └────────────┬──────────────┘
                     ▼
             EXPO MOBILE APP
```

---

## Features

- **AI Creator Workspace**: Prompt text input with character limits and clear actions.
- **Looping Loader**: Pulse and rotation loader using `react-native-reanimated` with cycling cosmic statuses.
- **Approve / Reject Action Flow**: Persists approved results to Google Sheets database or revisions to n8n.
- **Approved History**: A gallery showcasing saved posts.
- **Direct exports**: Trigger PDF, Word, and PNG downloads inside the mobile browser utilizing the `Linking` API.

---

## Getting Started

Ensure you have [Node.js](https://nodejs.org/) installed and the **Expo Go** app installed on your physical mobile device.

### 1. Install Dependencies

From the project root directory, run:
```bash
npm install && npm install --prefix server && npm install --prefix mobile
```

### 2. Configure Local Host IP for Physical Devices
Open `mobile/src/api/apiService.js` and update the base URL with your local machine's IP address:
```javascript
// Example:
const API_BASE_URL = 'http://192.168.1.50:5000/api';
```

### 3. Launch Servers

- **Backend Express Server**:
  ```bash
  npm run dev:server
  ```
- **Expo Mobile App**:
  ```bash
  npm run dev --prefix mobile
  ```
  Scan the QR code printed in the terminal using your phone's camera (iOS) or the Expo Go app (Android).
