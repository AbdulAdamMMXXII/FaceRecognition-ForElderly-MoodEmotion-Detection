# Face-API Model Setup

The mood detection feature uses face-api.js for on-device facial emotion analysis. Models are loaded from CDN by default, so **no setup is required** to get started.

## Default Setup (CDN - Recommended)

Models load automatically from jsDelivr CDN. This is the easiest approach and works out-of-the-box.

```ts
// Configured in src/app/services/moodAnalyzer.ts
const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.0/model/';
```

## Optional: Local Models (For Offline Use)

If you want to serve models locally:

1. Clone the face-api repo:
   ```bash
   git clone https://github.com/vladmandic/face-api.js.git
   ```

2. Copy model files to public directory:
   ```bash
   mkdir -p public/models
   cp face-api.js/model/*.json public/models/
   cp face-api.js/model/*.bin public/models/
   ```

3. Update `src/app/services/moodAnalyzer.ts`:
   ```ts
   const MODEL_URL = '/models';
   ```

