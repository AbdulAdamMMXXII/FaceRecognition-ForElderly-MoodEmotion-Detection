const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');

const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true' || !!process.env.FIREBASE_EMULATOR_HUB;

// Load .env file if it exists (for local development)
if (isEmulator) {
  try {
    require('dotenv').config();
  } catch (e) {
    // dotenv not installed or .env doesn't exist - fallback to functions.config()
  }
}

// Use the v2 firebase-functions modules for explicit trigger APIs
const { onRequest } = require('firebase-functions/v2/https');
const { onDocumentWritten, onDocumentCreated } = require('firebase-functions/v2/firestore');

// Try to load legacy functions config safely (may not exist in v2 runtime)
let functionsConfig = null;
try {
  const ff = require('firebase-functions');
  if (ff && typeof ff.config === 'function') functionsConfig = ff.config();
} catch (e) {
  // ignore - runtime may not expose functions.config()
}

admin.initializeApp();
const db = admin.firestore();
const NEGATIVE_EMOTIONS = ['sad', 'stressed', 'anxious', 'confused'];

function capitalize(value) {
  if (!value || typeof value !== 'string') return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (value && typeof value.toDate === 'function') {
    try {
      return value.toDate();
    } catch (e) {
      return null;
    }
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function getGeminiConfig() {
  const configuredModel = process.env.GEMINI_MODEL || (functionsConfig && functionsConfig.gemini && functionsConfig.gemini.model) || 'gemini-2.0-flash';
  const normalizedModel = String(configuredModel).replace(/^models\//, '');
  const fallbackModels = [
    normalizedModel,
    'gemini-2.0-flash',
    'gemini-2.5-flash'
  ].map((item) => String(item || '').replace(/^models\//, '').trim()).filter(Boolean);

  const uniqueModels = Array.from(new Set(fallbackModels));
  return {
    apiKey:
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.GEMINI_KEY ||
      (functionsConfig && functionsConfig.gemini && functionsConfig.gemini.key),
    model: normalizedModel,
    models: uniqueModels
  };
}

function isModelNotFound(status, rawBody) {
  if (status !== 404) return false;
  const text = String(rawBody || '').toLowerCase();
  return text.includes('not found') || text.includes('model') || text.includes('models/');
}

function isRetryableStatus(status) {
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

async function callGeminiGenerateContent({ model, apiKey, prompt }) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          topP: 0.9,
          maxOutputTokens: 1800,
          responseMimeType: 'application/json'
        }
      })
    });

    const rawBody = await response.text();
    return { ok: response.ok, status: response.status, rawBody };
  } finally {
    clearTimeout(timeout);
  }
}

function extractGeminiText(responseJson) {
  const candidates = responseJson && Array.isArray(responseJson.candidates) ? responseJson.candidates : [];
  const first = candidates[0] || {};
  const content = first.content || {};
  const parts = Array.isArray(content.parts) ? content.parts : [];
  return parts
    .map((part) => (part && typeof part.text === 'string' ? part.text : ''))
    .join('\n')
    .trim();
}

function parseModelJson(text) {
  if (!text || typeof text !== 'string') return null;

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : text.trim();

  try {
    return JSON.parse(candidate);
  } catch (e) {
    const firstBrace = candidate.indexOf('{');
    const lastBrace = candidate.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      try {
        return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
      } catch (innerErr) {
        return repairPartialModelJson(candidate.slice(firstBrace, lastBrace + 1));
      }
    }
    return repairPartialModelJson(candidate);
  }
}

function repairPartialModelJson(text) {
  if (!text || typeof text !== 'string') return null;

  const source = text.trim();
  if (!source.startsWith('{')) return null;

  const extractStringField = (fieldName) => {
    const strictPattern = new RegExp(`"${fieldName}"\\s*:\\s*"([\\s\\S]*?)"(?=\\s*,\\s*"|\\s*\\})`, 'i');
    const strictMatch = source.match(strictPattern);
    if (strictMatch && strictMatch[1]) return strictMatch[1].trim();

    const loosePattern = new RegExp(`"${fieldName}"\\s*:\\s*"([\\s\\S]*)`, 'i');
    const looseMatch = source.match(loosePattern);
    if (looseMatch && looseMatch[1]) {
      return looseMatch[1].trim().replace(/[",\s]+$/g, '');
    }

    return null;
  };

  const extractInsights = () => {
    const insightsMatch = source.match(/"insights"\s*:\s*\[(.*?)\]/is);
    if (!insightsMatch || !insightsMatch[1]) return null;
    const items = Array.from(insightsMatch[1].matchAll(/"((?:[^"\\]|\\.)*)"/g))
      .map((item) => item[1].replace(/\\"/g, '"').trim())
      .filter(Boolean);
    return items.length ? items : null;
  };

  const repaired = {};
  const elderlyMessage = extractStringField('elderlyMessage');
  const caregiverSummary = extractStringField('caregiverSummary');
  const reportSummary = extractStringField('reportSummary');
  const analysisNarrative = extractStringField('analysisNarrative');
  const riskLevel = extractStringField('riskLevel');
  const insights = extractInsights();

  if (elderlyMessage) repaired.elderlyMessage = elderlyMessage;
  if (caregiverSummary) repaired.caregiverSummary = caregiverSummary;
  if (reportSummary) repaired.reportSummary = reportSummary;
  if (analysisNarrative) repaired.analysisNarrative = analysisNarrative;
  if (insights) repaired.insights = insights;
  if (riskLevel && ['low', 'medium', 'high'].includes(riskLevel.toLowerCase())) {
    repaired.riskLevel = riskLevel.toLowerCase();
  }

  return Object.keys(repaired).length ? repaired : null;
}

function normalizeNarrative(candidate) {
  if (!candidate || typeof candidate !== 'object') return null;

  const elderlyMessage = typeof candidate.elderlyMessage === 'string' ? candidate.elderlyMessage.trim() : '';
  const caregiverSummary = typeof candidate.caregiverSummary === 'string' ? candidate.caregiverSummary.trim() : '';
  const reportSummary = typeof candidate.reportSummary === 'string' ? candidate.reportSummary.trim() : '';
  const analysisNarrative = typeof candidate.analysisNarrative === 'string' ? candidate.analysisNarrative.trim() : '';

  const insights = Array.isArray(candidate.insights)
    ? candidate.insights.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 8)
    : [];

  const rawRisk = String(candidate.riskLevel || '').toLowerCase();
  const riskLevel = ['low', 'medium', 'high'].includes(rawRisk) ? rawRisk : null;

  const hasRequired =
    elderlyMessage.length >= 40 &&
    caregiverSummary.length >= 80 &&
    reportSummary.length >= 160 &&
    analysisNarrative.length >= 160 &&
    insights.length >= 3 &&
    !!riskLevel;

  if (!hasRequired) return null;

  return {
    elderlyMessage,
    caregiverSummary,
    reportSummary,
    analysisNarrative,
    insights,
    riskLevel
  };
}

async function generateNarrativeWithGemini(payload) {
  const cfg = getGeminiConfig();

  if (!cfg.apiKey) {
    console.error('[LLM] GEMINI_API_KEY is not configured. Skipping LLM generation.');
    return {
      ok: false,
      source: 'llm-unavailable',
      errorCode: 'MISSING_API_KEY',
      errorDetail: 'Gemini API key is not configured in Functions runtime.'
    };
  }

  const prompt = [
    'You are generating factual LLM analysis for an elderly mood monitoring result.',
    'Return strictly valid JSON only (no markdown, no prose outside JSON).',
    'Use only facts from the input data and avoid any diagnosis/treatment claims.',
    'Make every section specific to this exact event, confidence value, and trend sequence.',
    'Return this exact JSON shape with all keys:',
    '{"elderlyMessage":"...","caregiverSummary":"...","reportSummary":"...","analysisNarrative":"...","insights":["..."],"riskLevel":"low|medium|high"}',
    'Content requirements:',
    '- elderlyMessage: 2-4 supportive sentences for the monitored person.',
    '- caregiverSummary: one detailed paragraph (>=80 characters).',
    '- reportSummary: one detailed executive-summary paragraph (>=160 characters).',
    '- analysisNarrative: one detailed explanatory paragraph (>=160 characters) explaining why this result matters now.',
    '- insights: 3 to 8 concrete, non-duplicated bullet-style strings tied to the input facts.',
    '- riskLevel must be exactly one of low, medium, high.',
    '',
    'Input data:',
    JSON.stringify(payload)
  ].join('\n');

  try {
    for (let i = 0; i < cfg.models.length; i++) {
      const model = cfg.models[i];
      for (let attempt = 1; attempt <= 3; attempt++) {
        const result = await callGeminiGenerateContent({ model, apiKey: cfg.apiKey, prompt });

        if (!result.ok) {
          if (isModelNotFound(result.status, result.rawBody) && i < cfg.models.length - 1) {
            console.warn(`[LLM] Model ${model} not found. Trying fallback model ${cfg.models[i + 1]}...`);
            break;
          }

          if (isRetryableStatus(result.status) && attempt < 3) {
            console.warn(`[LLM] Gemini ${model} attempt ${attempt} failed with ${result.status}. Retrying...`);
            await new Promise((resolve) => setTimeout(resolve, attempt * 1200));
            continue;
          }

          console.error('[LLM] Gemini request failed:', result.status, result.rawBody.slice(0, 800));
          return {
            ok: false,
            source: 'llm-unavailable',
            modelUsed: model,
            errorCode: `HTTP_${result.status}`,
            errorDetail: String(result.rawBody || '').slice(0, 800)
          };
        }

        let parsedResponse = null;
        try {
          parsedResponse = JSON.parse(result.rawBody);
        } catch (e) {
          if (attempt < 3) {
            console.warn(`[LLM] Invalid JSON body from Gemini ${model} attempt ${attempt}. Retrying...`);
            await new Promise((resolve) => setTimeout(resolve, attempt * 1200));
            continue;
          }
          console.error('[LLM] Failed to parse Gemini response body as JSON');
          return {
            ok: false,
            source: 'llm-unavailable',
            modelUsed: model,
            errorCode: 'INVALID_RESPONSE_JSON',
            errorDetail: String(result.rawBody || '').slice(0, 800)
          };
        }

        const modelText = extractGeminiText(parsedResponse);
        const candidateJson = parseModelJson(modelText);
        if (!candidateJson) {
          if (attempt < 3) {
            console.warn(`[LLM] Gemini returned non-JSON candidate on ${model} attempt ${attempt}. Retrying...`);
            await new Promise((resolve) => setTimeout(resolve, attempt * 1200));
            continue;
          }
          return {
            ok: false,
            source: 'llm-unavailable',
            modelUsed: model,
            errorCode: 'UNPARSABLE_MODEL_OUTPUT',
            errorDetail: String(modelText || '').slice(0, 800)
          };
        }

        const normalized = normalizeNarrative(candidateJson);
        if (!normalized) {
          if (attempt < 3) {
            console.warn(`[LLM] Gemini output missing required detail on ${model} attempt ${attempt}. Retrying...`);
            await new Promise((resolve) => setTimeout(resolve, attempt * 1200));
            continue;
          }
          return {
            ok: false,
            source: 'llm-unavailable',
            modelUsed: model,
            errorCode: 'INSUFFICIENT_NARRATIVE_DETAIL',
            errorDetail: JSON.stringify(candidateJson).slice(0, 800)
          };
        }

        return { ok: true, ...normalized, source: 'gemini', modelUsed: model };
      }
    }

    console.error('[LLM] No available Gemini Flash model responded successfully.');
    return {
      ok: false,
      source: 'llm-unavailable',
      errorCode: 'NO_WORKING_MODEL',
      errorDetail: 'All configured Gemini Flash models failed.'
    };
  } catch (err) {
    console.error('[LLM] Gemini call error:', err.message || err);
    return {
      ok: false,
      source: 'llm-unavailable',
      errorCode: 'GEMINI_EXCEPTION',
      errorDetail: err.message || String(err)
    };
  }
}

function getTransporter() {
  // prefer explicit environment variables (set via Firebase params or .env for local),
  // fall back to functions.config() when available (for Firebase console config).
  const cfg = {
    user: process.env.SMTP_USER || (functionsConfig && functionsConfig.smtp && functionsConfig.smtp.user),
    pass: process.env.SMTP_PASS || (functionsConfig && functionsConfig.smtp && functionsConfig.smtp.pass),
    host: process.env.SMTP_HOST || (functionsConfig && functionsConfig.smtp && functionsConfig.smtp.host),
    port: process.env.SMTP_PORT || (functionsConfig && functionsConfig.smtp && functionsConfig.smtp.port),
    secure: typeof process.env.SMTP_SECURE !== 'undefined' ? (process.env.SMTP_SECURE === 'true') : (functionsConfig && functionsConfig.smtp && functionsConfig.smtp.secure === 'true'),
    from: process.env.SMTP_FROM || (functionsConfig && functionsConfig.smtp && functionsConfig.smtp.from)
  };

  console.log(`[SMTP] Checking configuration:
    - Host: ${cfg.host ? '✓ configured' : '✗ missing'}
    - User: ${cfg.user ? '✓ configured' : '✗ missing'}
    - Pass: ${cfg.pass ? '✓ configured' : '✗ missing'}
    - Port: ${cfg.port || 587}
    - Secure: ${cfg.secure}`);

  if (!cfg.user || !cfg.pass || !cfg.host) {
    console.error('❌ SMTP not fully configured! Email sending will fail.');
    console.error('To fix: Set environment variables: SMTP_USER, SMTP_PASS, SMTP_HOST');
    console.error('For local dev: .env file in functions/');
    console.error('For Firebase: firebase functions:config:set smtp.user="..." smtp.pass="..." smtp.host="..."');
  }

  const transporterOptions = {
    host: cfg.host || 'localhost',
    port: cfg.port ? Number(cfg.port) : 587,
    secure: !!cfg.secure
  };
  if (cfg.user && cfg.pass) {
    transporterOptions.auth = { user: cfg.user, pass: cfg.pass };
  }

  return nodemailer.createTransport(transporterOptions);
}

function getSnapshotData(snapshotLike) {
  if (!snapshotLike) return null;
  if (typeof snapshotLike.data === 'function') {
    try {
      return snapshotLike.data();
    } catch (e) {
      return null;
    }
  }
  if (typeof snapshotLike.data === 'object') return snapshotLike.data;
  return null;
}

exports.onCaregiverRequest = onDocumentWritten('caregiverRequests/{uid}', async (event) => {
  const uid = event.params.uid;
  const change = event.data;
  const afterSnapshot = change && change.after ? change.after : null;
  if (!afterSnapshot || !afterSnapshot.exists) return null;

  const docData = getSnapshotData(afterSnapshot);
  if (!docData) return null;

  const token = docData.token;
  const caregiver = docData.caregiver || {};
  if (!token || !caregiver.email) {
    console.warn('Caregiver request missing token/email for uid:', uid);
    return null;
  }

  // Always use the production hosting URL for verification links so caregivers
  // can open them from any device. Override via APP_HOST env var if needed.
  const PRODUCTION_URL = 'https://elderly-mood-monitoring.web.app';
  const appHost =
    process.env.APP_HOST ||
    (functionsConfig && functionsConfig.app && functionsConfig.app.host) ||
    PRODUCTION_URL;
  console.log('[APP_HOST] Using:', appHost, isEmulator ? '(emulator mode)' : '(production mode)');
  const verifyUrl = `${appHost}/__/caregiver-verify?uid=${encodeURIComponent(uid)}&token=${encodeURIComponent(token)}`;

  const transporter = getTransporter();
  const mailOptions = {
    from: process.env.SMTP_FROM || (functionsConfig && functionsConfig.smtp && functionsConfig.smtp.from) || 'no-reply@example.com',
    to: caregiver.email,
    subject: `Verify caregiver access for monitored user`,
    text: `Hello ${caregiver.name},\n\nYou were added as a caregiver for a monitored user. Click the link to verify and accept caregiver access:\n\n${verifyUrl}\n\nThis link expires in 24 hours.\n`,
    html: `<p>Hello ${caregiver.name},</p><p>You were added as a caregiver for a monitored user. Click the link to verify and accept caregiver access:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p><p>This link expires in 24 hours.</p>`
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('✅ Verification email sent successfully to:', caregiver.email);
  } catch (err) {
    console.error('❌ Failed to send verification email to', caregiver.email);
    console.error('Error:', err.message || err);
    // Don't re-throw - let the function complete even if email fails
    // so the user can verify manually if needed
  }
  return null;
});

exports.verifyCaregiver = onRequest(async (req, res) => {
  const uid = req.query.uid;
  const token = req.query.token;
  
  // Set CORS headers to allow frontend to read response
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Content-Type', 'application/json');
  
  if (!uid || !token) {
    res.status(400).json({ 
      success: false, 
      error: 'Missing uid or token',
      errorCode: 'MISSING_PARAMS'
    });
    return;
  }
  try {
    const reqRef = db.collection('caregiverRequests').doc(String(uid));
    const doc = await reqRef.get();
    if (!doc.exists) {
      res.status(404).json({ 
        success: false, 
        error: 'No verification request found. The link may have expired or is invalid.',
        errorCode: 'NOT_FOUND'
      });
      return;
    }
    const data = doc.data();
    if (!data || data.token !== token) {
      res.status(403).json({ 
        success: false, 
        error: 'Invalid verification token. The link may have expired.',
        errorCode: 'INVALID_TOKEN'
      });
      return;
    }
    if (data.expiresAt && data.expiresAt.toDate && data.expiresAt.toDate() < new Date()) {
      res.status(410).json({ 
        success: false, 
        error: 'Verification link has expired. Please request a new verification link.',
        errorCode: 'EXPIRED'
      });
      return;
    }
    const caregiver = data.caregiver || {};
    
    // Save the caregiver with verified status
    const verifiedCaregiver = {
      ...caregiver,
      verified: true,
      verifiedAt: new Date()
    };
    
    await db.doc(`users/${uid}`).set({ caregiver: verifiedCaregiver }, { merge: true });
    console.log('✅ Caregiver verified and added to profile for uid:', uid, 'caregiver:', caregiver.email);
    
    // Delete the verification request
    await reqRef.delete();
    
    res.status(200).json({ 
      success: true,
      message: 'Caregiver verification successful!',
      caregiver: {
        name: caregiver.name,
        email: caregiver.email,
        verified: true,
        verifiedAt: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('❌ verifyCaregiver error', err);
    res.status(500).json({ 
      success: false, 
      error: 'Server error during verification. Please try again later.',
      errorCode: 'SERVER_ERROR',
      detail: err.message
    });
  }
});

async function generatePdfBuffer(profile, moodReading, narrative, context = {}) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers = [];
      doc.on('data', (d) => buffers.push(d));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      // ElderCare logo/header block
      const logoX = 50;
      const logoY = 45;
      doc.roundedRect(logoX, logoY, 36, 36, 6).fill('#2563EB');
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(14).text('EC', logoX + 8, logoY + 10, { width: 20, align: 'center' });
      doc.fillColor('#111827').font('Helvetica-Bold').fontSize(18).text('ElderCare', logoX + 48, logoY + 4);
      doc.fillColor('#4B5563').font('Helvetica').fontSize(10).text('Mood Monitor System', logoX + 48, logoY + 24);
      doc.y = logoY + 52;
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#E5E7EB').stroke();
      doc.moveDown();

      doc.fontSize(18).text('Mood Report', { underline: true });
      doc.moveDown();
      doc.fontSize(12).text(`Name: ${profile.name || ''}`);
      doc.text(`Phone: ${profile.emergencyContact?.phone || 'N/A'}`);
      doc.text(`Account ID: ${profile.id || ''}`);
      doc.moveDown();
      doc.fontSize(14).text('Detection Details');
      doc.fontSize(12).text(`Detected emotion: ${moodReading.emotion}`);
      doc.text(`Confidence: ${Math.round((moodReading.confidence || 0) * 100)}%`);
      doc.text(`Time: ${moodReading.timestamp?.toDate ? moodReading.timestamp.toDate().toString() : String(moodReading.timestamp)}`);
      if (typeof context.negativesToday === 'number') {
        doc.text(`Negative readings today: ${context.negativesToday}`);
      }
      if (typeof context.consecutive === 'number') {
        doc.text(`Consecutive negative readings: ${context.consecutive}`);
      }
      if (Array.isArray(context.recentMoodTrend) && context.recentMoodTrend.length) {
        doc.text(`Recent trend: ${context.recentMoodTrend.join(' -> ')}`);
      }
      doc.moveDown();
      doc.fontSize(14).text('AI Explanation & Recommendations');
      doc.fontSize(12).text(`Summary: ${narrative?.reportSummary || 'No summary available.'}`);
      doc.moveDown(0.5);
      doc.text(`Caregiver Context: ${narrative?.caregiverSummary || 'No caregiver context available.'}`);
      doc.text(`Risk Level: ${narrative?.riskLevel || 'unknown'}`);
      doc.moveDown(0.5);
      doc.font('Helvetica-Bold').text('Key Insights:');
      doc.font('Helvetica');
      const insights = Array.isArray(narrative?.insights) ? narrative.insights : [];
      if (insights.length === 0) {
        doc.text('1. No additional insights generated.');
      } else {
        insights.forEach((item, idx) => {
          doc.text(`${idx + 1}. ${item}`);
        });
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

exports.onMoodCreate = onDocumentCreated('users/{uid}/moods/{moodId}', async (event) => {
  const uid = event.params.uid;
  const moodId = event.params.moodId;
  const moodSnapshot = event.data;
  if (!moodSnapshot || !moodSnapshot.exists) return null;

  const mood = getSnapshotData(moodSnapshot);
  if (!mood) return null;

  try {
    const userDoc = await db.doc(`users/${uid}`).get();
    const profile = userDoc.exists
      ? (userDoc.data() || {})
      : {
          id: uid,
          name: 'User',
          age: 0,
          monitoringStatus: 'active',
          deviceStatus: 'online'
        };
    const caregiver = profile.caregiver || null;

    const moodsRef = db.collection('users').doc(uid).collection('moods');
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [todaySnap, recentTrendSnap] = await Promise.all([
      moodsRef.where('timestamp', '>=', startOfDay).get(),
      moodsRef.orderBy('timestamp', 'desc').limit(3).get()
    ]);

    const todayList = [];
    todaySnap.forEach((docSnap) => todayList.push(docSnap.data()));

    const negativesToday = todayList.filter((item) => NEGATIVE_EMOTIONS.includes(String(item.emotion || '').toLowerCase())).length;

    const sortedToday = todayList.sort((a, b) => {
      const aDate = toDate(a.timestamp);
      const bDate = toDate(b.timestamp);
      return (aDate ? aDate.getTime() : 0) - (bDate ? bDate.getTime() : 0);
    });

    let consecutive = 0;
    for (let i = sortedToday.length - 1; i >= 0; i--) {
      const reading = sortedToday[i];
      if (NEGATIVE_EMOTIONS.includes(String(reading.emotion || '').toLowerCase())) consecutive += 1;
      else break;
    }

    const recentMoodTrend = [];
    recentTrendSnap.forEach((docSnap) => {
      const data = docSnap.data() || {};
      if (data.emotion) recentMoodTrend.push(String(data.emotion));
    });
    recentMoodTrend.reverse();

    const notifyAfterCount = caregiver?.notifyAfterCount || 3;
    const notifyConsecutiveCount = caregiver?.notifyConsecutiveCount || 2;
    let shouldNotify = false;

    if (caregiver && caregiver.email && caregiver.verified) {
      if (negativesToday >= notifyAfterCount) shouldNotify = true;
      if (consecutive >= notifyConsecutiveCount) shouldNotify = true;
    }

    const moodTime = toDate(mood.timestamp) || new Date();
    const llmInput = {
      emotion: String(mood.emotion || 'neutral'),
      confidence: Number(mood.confidence) || 0,
      timestamp: moodTime.toISOString(),
      recentMoodTrend,
      alertsTriggered: shouldNotify,
      userAge: Number(profile.age) || null,
      negativesToday,
      consecutiveNegativeReadings: consecutive
    };

    const narrative = await generateNarrativeWithGemini(llmInput);
    const llmSucceeded = !!narrative.ok;
    const observedSummary = [
      `Detected emotion: ${String(mood.emotion || 'neutral')}.`,
      `Confidence: ${Math.round((Number(mood.confidence) || 0) * 100)}%.`,
      `Recent trend: ${recentMoodTrend.join(' -> ') || 'not available'}.`,
      `Negative readings today: ${negativesToday}.`,
      `Consecutive negatives: ${consecutive}.`
    ].join(' ');
    const reportSummary = llmSucceeded
      ? narrative.reportSummary
      : `LLM analysis unavailable for this result. ${observedSummary}`;
    const analysisNarrative = llmSucceeded
      ? narrative.analysisNarrative
      : `No model narrative was generated for this event. Reason: ${narrative.errorCode || 'unknown'}${narrative.errorDetail ? ` (${String(narrative.errorDetail).slice(0, 240)})` : ''}`;
    const caregiverSummary = llmSucceeded
      ? narrative.caregiverSummary
      : observedSummary;
    const elderlyMessage = llmSucceeded
      ? narrative.elderlyMessage
      : 'Mood result saved. Detailed LLM narrative is currently unavailable for this record.';
    const insights = llmSucceeded
      ? narrative.insights
      : [
          `Emotion captured: ${String(mood.emotion || 'neutral')}`,
          `Confidence captured: ${Math.round((Number(mood.confidence) || 0) * 100)}%`,
          `Trend captured: ${recentMoodTrend.join(' -> ') || 'not available'}`
        ];
    const riskLevel = llmSucceeded
      ? narrative.riskLevel
      : (NEGATIVE_EMOTIONS.includes(String(mood.emotion || '').toLowerCase()) ? 'medium' : 'low');
    const narrativeSource = llmSucceeded ? 'gemini' : narrative.source;

    // Persist LLM explanation alongside the mood record and user profile snapshot.
    const now = new Date();
    await Promise.all([
      db.doc(`users/${uid}/moods/${moodId}`).set({
        explanation: {
          elderlyMessage,
          caregiverSummary,
          reportSummary,
          analysisNarrative,
          insights,
          riskLevel,
          source: narrativeSource,
          modelUsed: narrative.modelUsed || null,
          llmStatus: llmSucceeded ? 'success' : 'error',
          llmErrorCode: llmSucceeded ? null : (narrative.errorCode || null),
          llmErrorDetail: llmSucceeded ? null : (narrative.errorDetail || null),
          generatedAt: now
        }
      }, { merge: true }),
      db.doc(`users/${uid}`).set({
        latestExplanation: {
          moodId,
          message: elderlyMessage,
          riskLevel,
          source: narrativeSource,
          modelUsed: narrative.modelUsed || null,
          llmStatus: llmSucceeded ? 'success' : 'error',
          llmErrorCode: llmSucceeded ? null : (narrative.errorCode || null),
          generatedAt: now
        }
      }, { merge: true })
    ]);

    // Write a report for the Reports page directly from the backend trigger.
    const reportsRef = db.collection('users').doc(uid).collection('reports').doc();
    await reportsRef.set({
      id: reportsRef.id,
      title: `Mood Analysis - ${capitalize(String(mood.emotion || 'neutral'))}`,
      summary: reportSummary,
      analysisNarrative,
      caregiverSummary,
      riskLevel,
      generatedAt: now,
      period: now.toLocaleDateString(),
      insights,
      source: narrativeSource,
      modelUsed: narrative.modelUsed || null,
      llmStatus: llmSucceeded ? 'success' : 'error',
      llmErrorCode: llmSucceeded ? null : (narrative.errorCode || null),
      moodId,
      emotion: String(mood.emotion || 'neutral'),
      confidence: Number(mood.confidence) || 0
    });

    // Keep alert center updated when notification rules are triggered.
    if (shouldNotify) {
      const severity = riskLevel === 'high' ? 'high' : (riskLevel === 'medium' ? 'medium' : 'low');
      const alertsRef = db.collection('users').doc(uid).collection('alerts').doc();
      await alertsRef.set({
        id: alertsRef.id,
        severity,
        title: `Mood Alert: ${capitalize(String(mood.emotion || 'neutral'))}`,
        description: caregiverSummary,
        timestamp: now,
        status: 'sent',
        source: narrativeSource,
        modelUsed: narrative.modelUsed || null
      });
    }

    // Email notifications remain caregiver-scoped and rule-based.
    if (!shouldNotify || !caregiver || !caregiver.email || !caregiver.verified) return null;

    const pdfBuf = await generatePdfBuffer(profile, mood, {
      reportSummary,
      caregiverSummary,
      insights,
      riskLevel
    }, {
      negativesToday,
      consecutive,
      recentMoodTrend
    });
    const transporter = getTransporter();
    const mailOptions = {
      from: process.env.SMTP_FROM || (functionsConfig && functionsConfig.smtp && functionsConfig.smtp.from) || 'no-reply@example.com',
      to: caregiver.email,
      subject: `Caregiver Alert: ${profile.name || 'Monitored user'} - ${mood.emotion}`,
      text: [
        `A new mood reading triggered the notification rules.`,
        `Emotion: ${mood.emotion}`,
        `Confidence: ${Math.round((mood.confidence || 0) * 100)}%`,
        `Recent trend: ${recentMoodTrend.join(' -> ') || 'N/A'}`,
        '',
        `Summary: ${caregiverSummary}`
      ].join('\n'),
      attachments: [{ filename: `mood-report-${Date.now()}.pdf`, content: pdfBuf }]
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log('Caregiver notification sent to', caregiver.email);
    } catch (err) {
      console.error('Failed to send caregiver notification', err);
    }
  } catch (err) {
    console.error('onMoodCreate error', err);
  }
  return null;
});
