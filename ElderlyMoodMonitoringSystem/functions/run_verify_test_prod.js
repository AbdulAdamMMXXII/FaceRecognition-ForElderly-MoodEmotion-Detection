const admin = require('firebase-admin');
const fetch = require('node-fetch');

async function main() {
  try {
    console.log('Initializing admin...');
    // Initialize with default credentials; CLI auth/ADC should work when logged in
    admin.initializeApp({ projectId: 'elderly-mood-monitoring' });
    const db = admin.firestore();

    const uid = 'test-user-1';
    const token = 'test-token-123';
    const caregiver = {
      name: 'Prod Tester',
      email: 'caregiver-prod@example.com',
      notifyAfterCount: 2,
      notifyConsecutiveCount: 2,
      summaryFrequency: 'weekly-monday'
    };

    const reqRef = db.collection('caregiverRequests').doc(uid);
    const payload = {
      uid,
      token,
      caregiver,
      requestedAt: admin.firestore.Timestamp.now(),
      expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000)
    };

    console.log('Writing caregiverRequests doc...', uid);
    await reqRef.set(payload, { merge: true });
    console.log('Wrote caregiverRequests doc for', uid);

    const verifyUrl = `https://us-central1-elderly-mood-monitoring.cloudfunctions.net/verifyCaregiver?uid=${encodeURIComponent(uid)}&token=${encodeURIComponent(token)}`;
    console.log('Calling verify URL:', verifyUrl);
    const res = await fetch(verifyUrl, { method: 'GET' });
    const text = await res.text();
    console.log('Verify response status:', res.status);
    console.log('Verify response body:', text);

    // read back user doc
    console.log('Reading users/' + uid);
    const userSnap = await db.doc(`users/${uid}`).get();
    if (!userSnap.exists) {
      console.log('users/' + uid + ' does not exist');
    } else {
      console.log('users/' + uid + ' data:', JSON.stringify(userSnap.data(), null, 2));
    }

  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
}

main().then(() => process.exit(0));
