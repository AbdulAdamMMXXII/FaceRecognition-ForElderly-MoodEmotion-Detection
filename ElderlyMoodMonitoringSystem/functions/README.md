Cloud Functions for caregiver verification and notifications

Setup

- Install dependencies in the `functions` folder:

```bash
cd functions
npm install
```

- Configure SMTP and app host for verification links via Firebase functions config:

```bash
firebase functions:config:set smtp.host="smtp.example.com" smtp.user="USERNAME" smtp.pass="PASSWORD" smtp.from="no-reply@example.com" app.host="https://your-app-domain.com"
```

- Configure Gemini (Google AI Studio free-tier API key) for narrative generation:

```bash
firebase functions:config:set gemini.key="YOUR_GEMINI_API_KEY" gemini.model="gemini-2.0-flash"
```

For local emulator development, you can also use environment variables in `functions/.env`:

```bash
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
GEMINI_MODEL=gemini-2.0-flash
SMTP_HOST=smtp.example.com
SMTP_USER=USERNAME
SMTP_PASS=PASSWORD
SMTP_FROM=no-reply@example.com
```

- Deploy functions:

```bash
firebase deploy --only functions
```

Notes
- The `onCaregiverRequest` trigger watches `caregiverRequests/{uid}` and sends verification emails.
- The HTTP endpoint `verifyCaregiver` verifies a token and writes `users/{uid}.caregiver`.
- The `onMoodCreate` trigger watches new mood readings, generates LLM explanations/reports, stores them in Firestore, and sends caregiver PDF notifications when thresholds are met.
- Caregiver PDFs now include an ElderCare branded logo header.

Gemini troubleshooting
- The trigger tries Flash model fallbacks automatically in this order: configured model -> `gemini-2.0-flash` -> `gemini-2.5-flash`.
- If you still see `models/... not found`, set `GEMINI_MODEL` explicitly to a model available for your key/project.
- If you see `429 quota exceeded` with free-tier token limits at `0`, enable Gemini API quota/billing in the Google AI project that owns your API key.
- You can provide the API key through `GEMINI_API_KEY` (preferred), `GOOGLE_API_KEY`, or `GEMINI_KEY`.
