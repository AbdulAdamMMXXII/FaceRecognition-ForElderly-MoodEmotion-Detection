**Project Title**: Elderly Mood Monitoring System

**Short Description**: 
- **Purpose**: Real-time facial expression mood monitoring for elderly care, caregiver verification, LLM-enhanced report generation, and PDF exports.
- **Stack**: React + Vite frontend, Firebase (Auth / Firestore / Functions), Node.js Cloud Functions, jsPDF/PDFKit, face-api.

**Features**
- **Mood Detection**: Webcam-based emotion detection and saving to Firestore.
- **Caregiver Verification**: Email-based verification flow for caregivers.
- **Reports**: LLM-enhanced analysis (optional) and downloadable PDF reports.
- **Alerts & Trends**: Mood trends, alerts, and basic analytics.
- **Graceful LLM Fallback**: System works without Gemini API key — LLM adds analysis only.

**Quick Links (important files)**
- Config: .runtimeconfig.json
- Email setup script: setup-email.sh
- Tests: utils.test.ts
- Utilities: moodUtils.ts, reportPdf.ts (compute helper exported)

**Prerequisites**
- Node.js (18+ recommended)
- npm
- Firebase CLI (for deploy/emulators)
- Optional: Google Gemini API key for LLM features

**Install & Run (local dev)**
- Install:
```bash
npm install
```
- Start dev server:
```bash
npm run dev
```
- Start Firebase emulators (Auth, Firestore, Functions):
```bash
firebase emulators:start --only auth,firestore,functions
```

**Environment / Secrets**
- Do NOT commit secrets. Use Firebase runtime config or environment variables.
- Primary secrets:
  - SMTP credentials (SMTP_USER, SMTP_PASS)
  - Gemini / LLM key (GEMINI_API_KEY / GEMINI_KEY)
- Example Firebase runtime config command (replace placeholders):
```bash
firebase functions:config:set \
  smtp.host="smtp.gmail.com" \
  smtp.port="587" \
  smtp.secure="false" \
  smtp.user="your-email@gmail.com" \
  smtp.pass="your-app-password-here" \
  smtp.from="noreply@elderly-mood-monitoring.firebaseapp.com" \
  gemini.key="your-gemini-api-key-here" \
  app.host="https://elderly-mood-monitoring.firebaseapp.com"
```
- Local .env (for emulator) example:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password-here
SMTP_FROM=noreply@elderly-mood-monitoring.firebaseapp.com
GEMINI_KEY=your-gemini-api-key-here
```
- Files changed to remove personal info: runtime config and docs. Replace placeholders before deploying.

**Tests**
- Added unit tests using Vitest in utils.test.ts.
- Run tests:
```bash
npm test
```
- Tests mock `jspdf` and canvas to avoid file IO and keep them fast.

**Build & Deploy**
- Build frontend:
```bash
npm run build
```
- Deploy hosting + functions (after setting runtime config):
```bash
firebase deploy --only hosting,functions
```
- Deploy functions only:
```bash
firebase deploy --only functions
```

**Gemini / LLM Behavior & Notes**
- The LLM is optional; if `gemini.key` is missing, functions log a warning and proceed with `llm-unavailable` flows. Core features remain functional.
- To enable LLM narratives, set `gemini.key` via runtime config (see above) and redeploy functions.
- If you publish repo publicly: rotate/replace any API keys and remove them from runtime config before pushing.

**SMTP / Email Notes**
- Email sending uses nodemailer in Functions. For Gmail, use an App Password (recommended) or a transactional provider (SendGrid, Mailgun).
- Default "from" used in docs: `noreply@elderly-mood-monitoring.firebaseapp.com` — change as needed.

**Troubleshooting**
- Emails not arriving:
  - Check function logs: `firebase functions:log`
  - Verify SMTP settings and app password
  - Check spam/junk and sender address
- LLM errors:
  - Check `GEMINI_KEY` is set and valid
  - Review logs for 4xx/5xx and retryable errors

**Security / Publishing Checklist (before public GitHub)**
- [ ] Remove/rotate any API keys (Gemini, Google APIs).
- [ ] Ensure `.env` and secrets are listed in .gitignore.
- [ ] Confirm .runtimeconfig.json contains only placeholders (not real keys) before pushing.
- [ ] Optionally create a README section that points to how to obtain and set secrets securely.
- [ ] Consider using GitHub Secrets + GitHub Actions for CI deploys (do not store keys in repo).

**Contributing**
- Fork → branch → PR
- Run tests locally (`npm test`)
- Keep changes small and focused; update docs where behavior changes.

**License & Attribution**
- Add a license file as appropriate (MIT, Apache-2.0, etc.) before publishing.
- Attribution: third-party libraries listed in package.json.

**Contact**
- For public repo contact placeholder: `noreply@elderly-mood-monitoring.firebaseapp.com` (or project maintainer email)

---
 
**Project structure**  
 *cmd: tree -L d -I "node_modules"*                
.  
├── ATTRIBUTIONS.md  
├── CAREGIVER_VERIFICATION_COMPLETE.md  
├── EMAIL_NOT_ARRIVING_FIX.md  
├── EMAIL_SETUP_GUIDE.md  
├── FACE_API_SETUP.md  
├── FUNCTIONAL_SUMMARY.md  
├── QUICK_START_CAREGIVER.md  
├── README.md  
├── READY_TO_USE.md  
├── SETUP_COMPLETE.md  
├── START_HERE.md  
├── TECHNICAL_STACK.md  
├── VSCODE_GUIDE.md  
├── apphosting.emulator.yaml  
├── dist  
│   ├── assets  
│   │   ├── html2canvas.esm-QH1iLAAe.js  
│   │   ├── index-BMKNP4QQ.css  
│   │   ├── index-DA6GVlf_.js  
│   │   ├── index.es-C6hdZrE9.js  
│   │   └── purify.es-B5CD4DQe.js  
│   ├── index.html  
│   └── models  
│       ├── face_expression_model-weights_manifest.json  
│       ├── face_expression_model.bin  
│       ├── tiny_face_detector_model-weights_manifest.json  
│       └── tiny_face_detector_model.bin  
├── download-models.js  
├── download-models.sh  
├── emulator.log  
├── firebase.json  
├── firestore-debug.log  
├── firestore.indexes.json  
├── firestore.rules  
├── functions  
│   ├── README.md  
│   ├── index.js  
│   ├── package-lock.json  
│   ├── package.json  
│   ├── run_verify_test_prod.js  
│   ├── test_caregiver_request.js  
│   ├── test_create_moods.js  
│   ├── test_create_request.js  
│   ├── test_e2e_verify.js  
│   ├── test_gemini_direct.js  
│   ├── test_llm_trigger.js  
│   └── test_smtp.js  
├── guidelines  
│   └── Guidelines.md  
├── index.html  
├── package-lock.json  
├── package.json  
├── postcss.config.mjs  
├── public  
│   ├── index.html  
│   └── models  
│       ├── face_expression_model-weights_manifest.json  
│       ├── face_expression_model.bin  
│       ├── tiny_face_detector_model-weights_manifest.json  
│       └── tiny_face_detector_model.bin  
├── setup-email.sh  
├── src  
│   ├── app  
│   │   ├── App.tsx  
│   │   ├── components  
│   │   │   ├── Layout.tsx  
│   │   │   ├── ProtectedRoute.tsx  
│   │   │   ├── figma  
│   │   │   │   └── ImageWithFallback.tsx  
│   │   │   └── ui  
│   │   │       ├── accordion.tsx  
│   │   │       ├── alert-dialog.tsx  
│   │   │       ├── alert.tsx  
│   │   │       ├── aspect-ratio.tsx  
│   │   │       ├── avatar.tsx  
│   │   │       ├── badge.tsx  
│   │   │       ├── breadcrumb.tsx  
│   │   │       ├── button.tsx  
│   │   │       ├── calendar.tsx  
│   │   │       ├── card.tsx  
│   │   │       ├── carousel.tsx  
│   │   │       ├── chart.tsx  
│   │   │       ├── checkbox.tsx  
│   │   │       ├── collapsible.tsx  
│   │   │       ├── command.tsx  
│   │   │       ├── context-menu.tsx  
│   │   │       ├── dialog.tsx  
│   │   │       ├── drawer.tsx  
│   │   │       ├── dropdown-menu.tsx  
│   │   │       ├── form.tsx  
│   │   │       ├── hover-card.tsx  
│   │   │       ├── input-otp.tsx  
│   │   │       ├── input.tsx  
│   │   │       ├── label.tsx  
│   │   │       ├── menubar.tsx  
│   │   │       ├── navigation-menu.tsx  
│   │   │       ├── pagination.tsx  
│   │   │       ├── popover.tsx  
│   │   │       ├── progress.tsx  
│   │   │       ├── radio-group.tsx  
│   │   │       ├── resizable.tsx  
│   │   │       ├── scroll-area.tsx  
│   │   │       ├── select.tsx  
│   │   │       ├── separator.tsx  
│   │   │       ├── sheet.tsx  
│   │   │       ├── sidebar.tsx  
│   │   │       ├── skeleton.tsx  
│   │   │       ├── slider.tsx  
│   │   │       ├── sonner.tsx  
│   │   │       ├── switch.tsx  
│   │   │       ├── table.tsx  
│   │   │       ├── tabs.tsx  
│   │   │       ├── textarea.tsx  
│   │   │       ├── toggle-group.tsx  
│   │   │       ├── toggle.tsx  
│   │   │       ├── tooltip.tsx  
│   │   │       ├── use-mobile.ts  
│   │   │       └── utils.ts  
│   │   ├── contexts  
│   │   │   └── AuthContext.tsx  
│   │   ├── pages  
│   │   │   ├── Alerts.tsx  
│   │   │   ├── Analytics.tsx  
│   │   │   ├── CaregiverVerify.tsx  
│   │   │   ├── Dashboard.tsx  
│   │   │   ├── Login.tsx
│   │   │   ├── MoodDetection.tsx  
│   │   │   ├── Profile.tsx  
│   │   │   ├── Reports.tsx  
│   │   │   └── SignUp.tsx 
│   │   ├── routes.tsx  
│   │   ├── services  
│   │   │   ├── firestore.ts  
│   │   │   └── moodAnalyzer.ts  
│   │   ├── types  
│   │   │   └── faceapi.d.ts  
│   │   ├── types.ts  
│   │   └── utils  
│   │       ├── moodUtils.ts  
│   │       └── reportPdf.ts  
│   ├── env.d.ts  
│   ├── firebase.ts   
│   ├── main.tsx  
│   └── styles  
│       ├── fonts.css  
│       ├── index.css  
│       ├── tailwind.css  
│       └── theme.css  
├── tests  
│   └── utils.test.ts  
└── vite.config.ts  
  
20 directories, 132 files  

## Ethical Considerations
- No raw facial images are permanently stored
- Data is anonymised and processed securely in the cloud
- GDPR principles are considered throughout system design
- The project follows BCU ethical research guidelines

## Author
**Abdulrazig Adam**  
BSc Computer Science with Honours (FYP) | Birmingham City University  
