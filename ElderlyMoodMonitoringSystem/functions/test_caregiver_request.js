process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
const admin = require('firebase-admin');

admin.initializeApp({ projectId: 'elderly-mood-monitoring' });
const db = admin.firestore();

(async () => {
  try {
    const uid = 'test-user-' + Date.now();
    const token = 'test-token-' + Date.now();
    const caregiver = {
      name: 'Test Caregiver',
      email: 'caregiver@example.com',
      notifyAfterCount: 3,
      notifyConsecutiveCount: 2,
      summaryFrequency: 'weekly-monday'
    };

    console.log('Creating caregiver request...');
    console.log('UID:', uid);
    console.log('Caregiver:', caregiver);

    await db.collection('caregiverRequests').doc(uid).set({
      uid,
      caregiver,
      token,
      requestedAt: admin.firestore.Timestamp.now(),
      expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000)
    });

    console.log('✅ Request created! Check function logs for email sending...');
    console.log('Waiting 3 seconds for function to trigger...');
    
    setTimeout(() => {
      console.log('Done. Check emulator logs above for email status.');
      process.exit(0);
    }, 3000);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
