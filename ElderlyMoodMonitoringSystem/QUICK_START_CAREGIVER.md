# Quick Start Guide - Testing Caregiver Verification

## 🚀 How to Test the Complete Flow

### Step 1: Start the Development Environment

```bash
# Terminal 1: Start Firebase Emulators
cd /Users/abduladam/ElderlyMoodMonitoringSystem
firebase emulators:start --only firestore,auth,functions

# Terminal 2: Start Frontend Dev Server
cd /Users/abduladam/ElderlyMoodMonitoringSystem
npm run dev
```

### Step 2: Use the Application

1. **Open browser:** `http://localhost:5173`

2. **Sign up / Login:**
   - Create a new account or login with existing credentials
   - You'll be redirected to the Dashboard

3. **Go to Profile:**
   - Click "Profile" in the sidebar
   - Scroll to "Caregiver Notification" section

4. **Add Caregiver:**
   - Enter caregiver name: e.g., "John Doe"
   - Enter caregiver email: **YOUR REAL EMAIL** (to receive the verification)
   - Set notification preferences
   - Click **"Request Verification"**
   - You'll see: "Verification email sent to caregiver..."

### Step 3: Check Your Email

1. **Open your email inbox** (the email you entered as caregiver)

2. **Look for email from:** `noreply@elderly-mood-monitoring.firebaseapp.com`
   - Subject: "Verify caregiver access for monitored user"

3. **Email contains:**
   - Personalized greeting
   - Verification link
   - Expiration notice (24 hours)

### Step 4: Click Verification Link

1. **Click the link in the email**
   - Opens: `http://localhost:5173/__/caregiver-verify?uid=...&token=...`

2. **See beautiful confirmation page:**
   - Loading spinner → Green checkmark
   - "Verification Successful!" message
   - "What happens next?" info section
   - "Close This Tab" button

### Step 5: Verify on Profile Page

1. **Go back to Profile page** in the app

2. **Caregiver section now shows:**
   - Caregiver name
   - Caregiver email
   - Notification settings
   - **"Change Caregiver"** button (not delete!)

3. **Try changing caregiver:**
   - Click "Change Caregiver"
   - Form pre-fills with current details
   - Update email to a different address
   - Click "Request Verification"
   - New email sent, old caregiver stays until new one verifies

---

## 🧪 Alternative: Test with Local Email Logging

If you don't want to use real email, you can modify the code to log emails instead:

**In `functions/index.js`**, find the `try { await transporter.sendMail(...)` block and add:

```javascript
console.log('📧 Email Details:');
console.log('To:', caregiver.email);
console.log('Subject:', mailOptions.subject);
console.log('Verify URL:', verifyUrl);
console.log('---');
```

Then check the emulator logs to see the verification URL and copy it to your browser.

---

## 📱 Testing Notifications (After Caregiver Verified)

### Trigger Mood-Based Notification:

1. **Go to Mood Detection page** (`/detection`)

2. **Upload image or capture photo**
   - Upload a sad/stressed face image multiple times
   - Or use test script:

```bash
cd /Users/abduladam/ElderlyMoodMonitoringSystem/functions
node test_create_moods.js
```

3. **Check emulator logs:**
   - Should see "Caregiver notification sent to [email]"

4. **Caregiver receives email with:**
   - Mood detection alert
   - PDF report attached
   - AI recommendations

---

## ✅ Success Indicators

**In Profile Page:**
- ✅ Shows "Change Caregiver" button (never shows "Delete")
- ✅ Displays current caregiver details
- ✅ Form pre-fills when changing

**In Email:**
- ✅ Email arrives within seconds
- ✅ From: noreply@elderly-mood-monitoring.firebaseapp.com
- ✅ Contains clickable verification link
- ✅ Link starts with http://localhost:5173/__/caregiver-verify

**In Verification Page:**
- ✅ Shows green checkmark on success
- ✅ Displays "Verification Successful!" message
- ✅ No redirect to login page
- ✅ Has "Close This Tab" button

**In Firestore (Emulator UI at http://localhost:4000):**
- ✅ Navigate to `users/{uid}` document
- ✅ Has `caregiver` object with:
  - `name`, `email`
  - `verified: true`
  - `verifiedAt` timestamp
  - `notifyAfterCount`, `notifyConsecutiveCount`, `summaryFrequency`

---

## 🔍 Debugging

**Email not sending?**
1. Check functions emulator logs
2. Look for "Verification email sent to..."
3. Check spam folder
4. Verify SMTP credentials in `/functions/.env`

**Verification fails?**
1. Check link hasn't expired (24 hours)
2. Check link wasn't already used
3. Look at browser console for errors
4. Check functions logs for HTTP response

**Caregiver not showing on profile?**
1. Refresh the page
2. Check Firestore emulator for data
3. Check browser console for fetch errors
4. Verify user is logged in

---

## 🎯 Expected Behavior Summary

| Action | Expected Result |
|--------|----------------|
| Click "Request Verification" | Email sent, alert shown |
| Open verification email | Link to verification page |
| Click verification link | Success page with checkmark |
| Return to profile | Shows "Change Caregiver" button |
| Click "Change Caregiver" | Form opens with current data |
| Update and request again | New email sent, old stays active |
| Cancel change | Form closes, no changes |

---

**All systems operational! 🚀**

Check [CAREGIVER_VERIFICATION_COMPLETE.md](./CAREGIVER_VERIFICATION_COMPLETE.md) for full technical documentation.
