const admin = require('firebase-admin');

process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';

admin.initializeApp({ projectId: 'elderly-mood-monitoring' });
const db = admin.firestore();

(async () => {
  const uid = 'test-user-1';
  const moods = [
    { emotion: 'sad', confidence: 0.85, timestamp: new Date() },
    { emotion: 'sad', confidence: 0.8, timestamp: new Date() },
    { emotion: 'sad', confidence: 0.9, timestamp: new Date() }
  ];
  for (const m of moods) {
    await db.collection('users').doc(uid).collection('moods').add(m);
    console.log('Added mood', m.emotion, m.confidence);
  }
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
