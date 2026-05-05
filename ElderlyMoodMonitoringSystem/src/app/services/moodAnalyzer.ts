import type { EmotionType } from '../types';
// face-api module does not ship types with this distribution; we declare a simple module
// See declaration file in src/app/types/faceapi.d.ts
import * as faceapi from '@vladmandic/face-api';
import { mapExpressionToEmotion } from '../utils/moodUtils';

let modelsLoaded = false;

// load models from CDN with fallback sources
export async function loadFaceApiModels(): Promise<void> {
  if (modelsLoaded) return;
  
  const cdnUrls = [
    '/models/', // prefer local copies served from public/models
    'https://raw.githubusercontent.com/vladmandic/face-api/master/model/',
    'https://unpkg.com/@vladmandic/face-api@1.7.0/model/',
    'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.0/model/',
  ];
  
  let lastError: any;
  
  // Try each CDN URL in order
  for (const MODEL_URL of cdnUrls) {
    try {
      console.log(`Attempting to load models from: ${MODEL_URL}`);
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
      ]);
      modelsLoaded = true;
      console.log('Models loaded successfully');
      return;
    } catch (err) {
      lastError = err;
      console.warn(`Failed to load from ${MODEL_URL}:`, err);
      continue;
    }
  }
  
  // All CDNs failed
  console.error('Failed to load models from all CDN sources:', lastError);
  throw new Error('Failed to load emotion detection models. Internet connection may be required or models may be unavailable from CDN.');
}

// analyze base64 image (data URL) and return emotion/confidence
export async function analyzeImage(imageDataUrl: string): Promise<{ emotion: EmotionType; confidence: number }> {
  await loadFaceApiModels();

  // create an image element from the data URL
  const img = new Image();
  img.crossOrigin = 'anonymous'; // allow CORS to read pixel data
  img.src = imageDataUrl;

  await new Promise((resolve, reject) => {
    img.onload = () => resolve(null);
    img.onerror = (e) => reject(e);
  });

  // Draw image to canvas to ensure pixel data is properly accessible
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Unable to get canvas context for image processing');
  }
  
  ctx.drawImage(img, 0, 0);

  // Detection strategies (try multiple fallbacks to be tolerant with varied images)
  const detectorOptionsList = [
    new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.3 }),
    new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.35 }),
    new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.4 })
  ];

  let detection: any = null;

  // 1) try detectSingleFace with different options
  for (const opt of detectorOptionsList) {
    try {
      detection = await faceapi.detectSingleFace(canvas, opt).withFaceExpressions();
      if (detection && detection.expressions) break;
    } catch (e) {
      // continue to next option
      console.warn('detectSingleFace attempt failed', e);
    }
  }

  // 2) if no single detection, try detectAllFaces and pick the largest box
  if (!detection || !detection.expressions) {
    try {
      for (const opt of detectorOptionsList) {
        const detections = await faceapi.detectAllFaces(canvas, opt).withFaceExpressions();
        if (detections && detections.length) {
          // pick the detection with largest box area
          detection = detections.reduce((best: any, cur: any) => {
            const a = cur.detection.box.width * cur.detection.box.height;
            const b = best ? best.detection.box.width * best.detection.box.height : 0;
            return a > b ? cur : best;
          }, null);
          if (detection && detection.expressions) break;
        }
      }
    } catch (e) {
      console.warn('detectAllFaces attempts failed', e);
    }
  }

  // 3) upscale small images and retry as a last resort
  if ((!detection || !detection.expressions) && (canvas.width < 400 || canvas.height < 400)) {
    try {
      const upCanvas = document.createElement('canvas');
      const scale = Math.max(1.5, 800 / Math.max(canvas.width, canvas.height));
      upCanvas.width = Math.round(canvas.width * scale);
      upCanvas.height = Math.round(canvas.height * scale);
      const upCtx = upCanvas.getContext('2d');
      upCtx?.drawImage(canvas, 0, 0, upCanvas.width, upCanvas.height);
      for (const opt of detectorOptionsList) {
        try {
          detection = await faceapi.detectSingleFace(upCanvas, opt).withFaceExpressions();
          if (detection && detection.expressions) break;
        } catch (e) {
          console.warn('Upscaled detect attempt failed', e);
        }
      }
    } catch (e) {
      console.warn('Upscale attempts failed', e);
    }
  }

  if (!detection || !detection.expressions) {
    throw new Error('No face detected in the image. Please ensure the image contains a clear, front-facing face.');
  }

  // pick highest probability expression
  let bestExpr = 'neutral';
  let bestProb = 0;
  // expressions object values are numbers
  const exprs = detection.expressions as Record<string, number>;
  for (const [expr, prob] of Object.entries(exprs)) {
    if (prob > bestProb) {
      bestProb = prob;
      bestExpr = expr;
    }
  }

  const emotion = mapExpressionToEmotion(bestExpr);
  const confidence = bestProb;
  return { emotion, confidence };
}
