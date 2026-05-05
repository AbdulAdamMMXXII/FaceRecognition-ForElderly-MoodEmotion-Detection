const admin = require('firebase-admin');

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'elderly-mood-monitoring';
const USE_EMULATOR = process.env.USE_EMULATOR === '1';
const MAX_WAIT_MS = Number(process.env.MAX_WAIT_MS || 90000);
const REQUIRE_GEMINI = process.env.REQUIRE_GEMINI === '1';
const SKIP_PROFILE = process.env.SKIP_PROFILE === '1';

if (USE_EMULATOR) {
  process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080';
}

admin.initializeApp({ projectId: PROJECT_ID });
const db = admin.firestore();

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForCondition(fn, timeoutMs, intervalMs = 2000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const value = await fn();
    if (value) return value;
    await sleep(intervalMs);
  }
  return null;
}

async function main() {
  const uid = `llm-test-user-${Date.now()}`;
  const userRef = db.doc(`users/${uid}`);
  const moodsRef = userRef.collection('moods');
  const reportsRef = userRef.collection('reports');

  console.log('-------------------------------------------');
  console.log('LLM Trigger Smoke Test');
  console.log('Project:', PROJECT_ID);
  console.log('Mode:', USE_EMULATOR ? 'emulator' : 'production');
  console.log('Require Gemini source:', REQUIRE_GEMINI ? 'yes' : 'no');
  console.log('Skip pre-created profile:', SKIP_PROFILE ? 'yes' : 'no');
  console.log('-------------------------------------------');

  if (!SKIP_PROFILE) {
    await userRef.set({
      id: uid,
      name: 'LLM Test User',
      age: 78,
      monitoringStatus: 'active',
      deviceStatus: 'online',
      lastActivity: new Date()
    }, { merge: true });
  }

  const moodRef = moodsRef.doc();
  const moodPayload = {
    id: moodRef.id,
    emotion: 'sad',
    confidence: 0.84,
    timestamp: new Date()
  };

  console.log('Writing mood record:', moodRef.id);
  await moodRef.set(moodPayload);

  console.log('Waiting for Cloud Function to attach explanation...');
  const moodWithExplanation = await waitForCondition(async () => {
    const snap = await moodRef.get();
    const data = snap.data() || {};
    return data.explanation ? data : null;
  }, MAX_WAIT_MS);

  if (!moodWithExplanation) {
    throw new Error(`Timed out waiting for mood explanation after ${MAX_WAIT_MS}ms.`);
  }

  const explanation = moodWithExplanation.explanation || {};
  console.log('Explanation source:', explanation.source || 'unknown');
  console.log('Elderly message preview:', String(explanation.elderlyMessage || '').slice(0, 120));

  console.log('Waiting for generated report...');
  const reportDoc = await waitForCondition(async () => {
    const snap = await reportsRef.where('moodId', '==', moodRef.id).limit(1).get();
    if (snap.empty) return null;
    return snap.docs[0];
  }, MAX_WAIT_MS);

  if (!reportDoc) {
    throw new Error(`Timed out waiting for generated report after ${MAX_WAIT_MS}ms.`);
  }

  const reportData = reportDoc.data() || {};
  console.log('Generated report:', reportDoc.id);
  console.log('Report source:', reportData.source || 'unknown');
  console.log('Report summary preview:', String(reportData.summary || '').slice(0, 120));

  if (REQUIRE_GEMINI && (explanation.source !== 'gemini' || reportData.source !== 'gemini')) {
    throw new Error('Gemini was required but trigger output source was not gemini. Check GEMINI_API_KEY configuration.');
  }

  console.log('\n✅ LLM trigger smoke test passed.');

  // Cleanup test docs
  await Promise.all([
    moodRef.delete().catch(() => {}),
    reportDoc.ref.delete().catch(() => {}),
    userRef.set({ latestExplanation: admin.firestore.FieldValue.delete() }, { merge: true }).catch(() => {}),
    userRef.delete().catch(() => {})
  ]);
}

main().then(() => process.exit(0)).catch((err) => {
  console.error('\n❌ LLM trigger smoke test failed:', err.message || err);
  process.exit(1);
});
