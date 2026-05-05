#!/usr/bin/env node
/**
 * Download face-api models to local public/models directory
 * Run: node download-models.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const MODELS_DIR = 'public/models';
const MODEL_FILES = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model-shard1.bin',
  'face_expression_model-weights_manifest.json',
  'face_expression_model-shard1.bin'
];

const BASE_URL = 'https://unpkg.com/@vladmandic/face-api@1.7.0/model/';

async function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${url}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {}); // Delete file if error
      reject(err);
    });
  });
}

async function main() {
  console.log('📥 Downloading face-api models...\n');

  // Create models directory if it doesn't exist
  if (!fs.existsSync(MODELS_DIR)) {
    fs.mkdirSync(MODELS_DIR, { recursive: true });
    console.log(`✓ Created ${MODELS_DIR} directory\n`);
  }

  let success = 0;
  let failed = 0;

  for (const file of MODEL_FILES) {
    const url = BASE_URL + file;
    const filepath = path.join(MODELS_DIR, file);

    try {
      console.log(`Downloading ${file}...`);
      await downloadFile(url, filepath);
      console.log(`✓ Downloaded ${file}\n`);
      success++;
    } catch (err) {
      console.error(`✗ Failed to download ${file}: ${err.message}\n`);
      failed++;
    }
  }

  console.log(`\n📊 Results: ${success} succeeded, ${failed} failed\n`);

  if (failed === 0) {
    console.log('✅ All models downloaded successfully!\n');
    console.log('To use local models, update src/app/services/moodAnalyzer.ts:');
    console.log("Change the cdnUrls array to include: 'https://localhost:5173/models/'");
    console.log("Or update to: const MODEL_URL = '/models/'; (single URL mode)\n");
  } else {
    console.log('⚠️  Some models failed to download. Check internet connection.\n');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
