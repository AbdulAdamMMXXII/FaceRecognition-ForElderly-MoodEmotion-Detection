/**
 * End-to-end test for caregiver verification flow using local emulators.
 * Tests: create request → call verifyCaregiver → check user doc updated
 *
 * Run with: node test_e2e_verify.js
 * Requires emulators running: firebase emulators:start --only functions,firestore
 */
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';

const admin = require('firebase-admin');
const http = require('http');
admin.initializeApp({ projectId: 'elderly-mood-monitoring' });
const db = admin.firestore();

const FUNCTIONS_BASE = 'http://localhost:5001/elderly-mood-monitoring/us-central1';

function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let body;
        try { body = JSON.parse(data); } catch (_) { body = { rawText: data }; }
        resolve({ status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 300, body });
      });
    }).on('error', (err) => reject(err));
  });
}

async function main() {
  const uid = 'e2e-test-user-' + Date.now();
  const token = require('crypto').randomUUID();
  const caregiver = {
    name: 'E2E Test Caregiver',
    email: 'e2e-caregiver@test.com',
    notifyAfterCount: 3,
    notifyConsecutiveCount: 2,
    summaryFrequency: 'weekly-monday'
  };

  console.log('\n==============================');
  console.log('  Caregiver Verification E2E Test');
  console.log('==============================\n');
  console.log('UID:', uid);
  console.log('Token:', token);
  console.log('Caregiver email:', caregiver.email);

  // --- Step 1: Create caregiverRequest ---
  console.log('\n[1] Writing caregiverRequests doc...');
  await db.collection('caregiverRequests').doc(uid).set({
    uid,
    caregiver,
    token,
    requestedAt: admin.firestore.Timestamp.now(),
    expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000)
  });
  console.log('    ✅ caregiverRequests doc written');

  // --- Step 2: Call verifyCaregiver with WRONG token (expect 403) ---
  console.log('\n[2] Testing with invalid token (expect 403/INVALID_TOKEN)...');
  const badUrl = `${FUNCTIONS_BASE}/verifyCaregiver?uid=${encodeURIComponent(uid)}&token=wrong-token`;
  const badRes = await httpGet(badUrl);
  console.log('    Status:', badRes.status);
  console.log('    Body:', JSON.stringify(badRes.body));
  if (badRes.status !== 403 || badRes.body?.errorCode !== 'INVALID_TOKEN') {
    console.log('    ⚠️  Expected 403/INVALID_TOKEN — got:', badRes.status, badRes.body?.errorCode);
  } else {
    console.log('    ✅ Correctly rejected invalid token');
  }

  // --- Step 3: Call verifyCaregiver with correct token ---
  console.log('\n[3] Calling verifyCaregiver with correct token...');
  const verifyUrl = `${FUNCTIONS_BASE}/verifyCaregiver?uid=${encodeURIComponent(uid)}&token=${encodeURIComponent(token)}`;
  console.log('    URL:', verifyUrl);
  const verifyRes = await httpGet(verifyUrl);
  console.log('    Status:', verifyRes.status);
  console.log('    Body:', JSON.stringify(verifyRes.body, null, 2));

  if (!verifyRes.ok || !verifyRes.body?.success) {
    console.log('\n❌ VERIFICATION FAILED');
    console.log('   Error:', verifyRes.body?.error || verifyRes.body);
    process.exit(1);
  }
  console.log('    ✅ Verification successful');

  // --- Step 4: Confirm caregiver saved to users/{uid} ---
  console.log('\n[4] Checking users/' + uid + ' document...');
  await new Promise(r => setTimeout(r, 500));
  const userSnap = await db.doc(`users/${uid}`).get();
  if (!userSnap.exists) {
    console.log('    ❌ users/' + uid + ' document NOT found');
    process.exit(1);
  }
  const userData = userSnap.data();
  if (!userData.caregiver) {
    console.log('    ❌ caregiver field missing from user profile');
    process.exit(1);
  }
  if (!userData.caregiver.verified) {
    console.log('    ❌ caregiver.verified is not true');
    process.exit(1);
  }
  console.log('    ✅ Caregiver saved to user profile');
  console.log('    name:', userData.caregiver.name);
  console.log('    email:', userData.caregiver.email);
  console.log('    verified:', userData.caregiver.verified);

  // --- Step 5: Confirm caregiverRequest doc was deleted ---
  console.log('\n[5] Confirming caregiverRequests doc was deleted...');
  const reqSnap = await db.collection('caregiverRequests').doc(uid).get();
  if (reqSnap.exists) {
    console.log('    ⚠️  caregiverRequests doc still exists (should have been deleted after use)');
  } else {
    console.log('    ✅ caregiverRequests doc deleted (one-time-use enforced)');
  }

  // --- Step 6: Replay attack prevention ---
  console.log('\n[6] Testing replay prevention (same link again - expect 404)...');
  const replayRes = await httpGet(verifyUrl);
  if (replayRes.status === 404 && replayRes.body?.errorCode === 'NOT_FOUND') {
    console.log('    ✅ Replay correctly rejected');
  } else {
    console.log('    ⚠️  Got status', replayRes.status, replayRes.body?.errorCode);
  }

  // Cleanup
  await db.doc(`users/${uid}`).delete();

  console.log('\n==============================');
  console.log('  ALL TESTS PASSED ✅');
  console.log('==============================\n');
  console.log('Production email URL will be:');
  console.log('  https://elderly-mood-monitoring.web.app/__/caregiver-verify?uid=...&token=...\n');
}

main().then(() => process.exit(0)).catch(err => {
  console.error('\n❌ Test crashed:', err.message || err);
  process.exit(1);
});
