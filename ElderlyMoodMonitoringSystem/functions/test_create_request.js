const admin = require('firebase-admin');

process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';

admin.initializeApp({ projectId: 'elderly-mood-monitoring' });
const db = admin.firestore();

(async () => {
  const uid = 'test-user-1';
  const token = 'test-token-123';
  const caregiver = {
    name: 'Local Tester',
    email: 'caregiver-test@example.com',
    notifyAfterCount: 3,
    notifyConsecutiveCount: 2,
    summaryFrequency: 'weekly-monday'
  };
  await db.collection('caregiverRequests').doc(uid).set({ uid, token, caregiver, requestedAt: admin.firestore.Timestamp.now(), expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000) });
  console.log('Created caregiver request for', uid, 'token', token);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
