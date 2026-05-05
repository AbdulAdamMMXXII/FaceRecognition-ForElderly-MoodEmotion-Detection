try {
  require('dotenv').config();
} catch (e) {
  // ignore if dotenv is unavailable
}

let runtimeConfig = null;
try {
  // eslint-disable-next-line import/no-dynamic-require, global-require
  runtimeConfig = require('./.runtimeconfig.json');
} catch (e) {
  runtimeConfig = null;
}

const configuredModel = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const modelCandidates = Array.from(new Set([
  configuredModel,
  'gemini-2.0-flash',
  'gemini-2.5-flash'
].map((m) => String(m || '').replace(/^models\//, '').trim()).filter(Boolean)));

const apiKey =
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_API_KEY ||
  process.env.GEMINI_KEY ||
  (runtimeConfig && runtimeConfig.gemini && runtimeConfig.gemini.key);

function extractText(responseJson) {
  const candidates = Array.isArray(responseJson?.candidates) ? responseJson.candidates : [];
  const parts = Array.isArray(candidates[0]?.content?.parts) ? candidates[0].content.parts : [];
  return parts.map((p) => (typeof p?.text === 'string' ? p.text : '')).join('\n').trim();
}

async function callModel(model) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: 'Return JSON only: {"status":"ok","message":"Gemini direct test successful"}' }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 120,
        responseMimeType: 'application/json'
      }
    })
  });

  const rawBody = await response.text();
  return { status: response.status, ok: response.ok, rawBody };
}

async function main() {
  if (!apiKey) {
    throw new Error('Missing Gemini API key. Set GEMINI_API_KEY, GOOGLE_API_KEY, or GEMINI_KEY.');
  }

  console.log('Gemini Direct Connectivity Test');
  console.log('Models to try:', modelCandidates.join(' -> '));

  for (let i = 0; i < modelCandidates.length; i++) {
    const model = modelCandidates[i];
    console.log(`\nTrying model: ${model}`);

    const result = await callModel(model);
    if (!result.ok) {
      console.log(`Request failed (status ${result.status})`);
      console.log('Response preview:', result.rawBody.slice(0, 240));

      const notFound = result.status === 404;
      if (notFound && i < modelCandidates.length - 1) {
        console.log('Model unavailable, trying next fallback...');
        continue;
      }

      throw new Error(`Gemini request failed for ${model} with status ${result.status}.`);
    }

    let parsed;
    try {
      parsed = JSON.parse(result.rawBody);
    } catch (err) {
      throw new Error(`Success status but invalid JSON response for ${model}.`);
    }

    const text = extractText(parsed);
    console.log('Success with model:', model);
    console.log('Response preview:', text.slice(0, 200) || '[empty text]');
    return;
  }

  throw new Error('No Gemini model succeeded.');
}

main().then(() => {
  console.log('\nDirect Gemini test passed.');
  process.exit(0);
}).catch((err) => {
  console.error('\nDirect Gemini test failed:', err.message || err);
  process.exit(1);
});
