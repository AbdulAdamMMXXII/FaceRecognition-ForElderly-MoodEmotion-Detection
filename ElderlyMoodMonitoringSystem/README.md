# ElderCare Mood Monitor System

An AI-Powered Facial Recognition and Mood Monitoring System for Elderly Well-Being. This caregiver dashboard provides real-time emotional state monitoring, historical analytics, alerts, and AI-generated reports.

## Features

### 🔐 Authentication
- **Login & Sign Up**: Secure authentication system with form validation
- **Protected Routes**: Dashboard accessible only after authentication
- Demo credentials: Any email/password will work (Firebase Authentication)

### 📊 Dashboard Pages

1. **Real-Time Dashboard**
   - Current emotional state with color-coded indicators
   - Confidence score visualization
   - Monitoring and device status
   - Last activity tracking

2. **AI Mood Detection**
   - Upload image or use camera to capture photo
   - On-device emotion detection using face-api.js (TensorFlow.js models)
   - Real-time confidence scoring
   - Support for 6 emotions: happy, sad, neutral, stressed, anxious, confused
   - Result is stored to Firestore and used throughout the app

> **Model files:** Download the face-api models and place them in `public/models` or use the CDN path. See the `src/app/services/moodAnalyzer.ts` comments for details.

3. **Historical Analytics**
   - Interactive charts (line, bar, pie) showing mood trends
   - Time range filters (7, 14, 30 days)
   - Emotional distribution analysis
   - Key insights and statistics

4. **Alert Centre**
   - Filterable alerts by severity (low, medium, high) and status
   - Alert tracking (sent, acknowledged, resolved)
   - Timestamp and detailed descriptions
   - Summary statistics

5. **Caregiver Reports**
   - AI-generated weekly and monthly summaries
   - LLM-powered insights and recommendations
   - Downloadable PDF reports (ready for integration)
   - Contextual explanations of mood patterns

6. **User Profile**
   - Elderly person's profile information
   - Emergency contact details
   - Device and monitoring status
   - System configuration info

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or pnpm

### Installation

1. Clone or download this project

2. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`
   or
   \`\`\`bash
   pnpm install
   \`\`\`


3. (Optional) Start Firebase emulators for local testing (requires Firebase CLI):
   ```bash
   firebase emulators:start --only firestore,auth,hosting
   ```
   The application will automatically connect to the emulators when running in development, applying the rules defined in `firestore.rules`.

3. Start the development server:
   \`\`\`bash
   npm run dev
   \`\`\`
   or
   \`\`\`bash
   pnpm dev
   \`\`\`

4. Open your browser and navigate to the local development URL (usually `http://localhost:5173`)

### Testing the Application

1. **Login Page**: Start at `/login` - enter any email and password to log in
2. **Sign Up**: Go to `/signup` to create a new account (uses Firebase Auth)
3. **Dashboard**: View real-time mood monitoring
4. **Mood Detection**: Upload an image or use your camera to detect mood
5. **Analytics**: Explore mood trends with interactive charts
6. **Alerts**: View and filter system alerts
7. **Reports**: Read AI-generated caregiver reports
8. **Profile**: View elderly person's profile and system info
9. **Logout**: Click logout button in sidebar to return to login page

## Technology Stack

- **React** - UI framework
- **TypeScript** - Type safety
- **React Router** - Navigation and routing
- **Recharts** - Data visualization
- **Tailwind CSS v4** - Styling
- **Lucide React** - Icons
- **date-fns** - Date formatting
- **Vite** - Build tool

## Project Structure

\`\`\`
src/
├── app/
│   ├── components/
│   │   ├── Layout.tsx              # Main layout with sidebar
│   │   ├── ProtectedRoute.tsx      # Route protection
│   │   ├── figma/
│   │   └── ui/                     # UI components (card, button, etc.)
│   ├── data/
│   │   └── (data files replaced with live Firestore)             # previously mock data
│   ├── pages/
│   │   ├── Login.tsx               # Login page
│   │   ├── SignUp.tsx              # Sign up page
│   │   ├── Dashboard.tsx           # Real-time dashboard
│   │   ├── MoodDetection.tsx       # Image upload & camera
│   │   ├── Analytics.tsx           # Historical analytics
│   │   ├── Alerts.tsx              # Alert centre
│   │   ├── Reports.tsx             # AI reports
│   │   └── Profile.tsx             # User profile
│   ├── types.ts                    # TypeScript types
│   ├── routes.ts                   # Route configuration
│   └── App.tsx                     # Main app component
└── styles/                         # CSS files
\`\`\`

## Key Features Explained

### AI Detection
The mood detection feature now runs entirely in the browser using face-api.js and TensorFlow.js models. Emotions are calculated from the uploaded/captured image and saved to Firestore. For a production system you could still replace this client‑side logic with a cloud API (Google Cloud Vision, Azure Face API, AWS Rekognition, etc.) or your own custom model.

### Authentication
Authentication currently uses Firebase Auth (demo credentials accepted). In production you can lock it down further with proper rules, Auth0, or other providers.

### Data Storage
The app now reads and writes to Firestore collections under each user. Historical analytics and reports are built from that live data.

## Accessibility Features

- ✅ Large, readable fonts (minimum 14px)
- ✅ High contrast color schemes
- ✅ Color-coded emotional states
- ✅ Clear visual indicators
- ✅ Keyboard navigation support
- ✅ Responsive design for desktop and tablets

## Camera Permissions

For the mood detection feature to work with your camera:
1. Your browser will request camera permissions
2. Click "Allow" when prompted
3. Make sure you're using HTTPS or localhost

## Firestore Security Rules

The project includes a `firestore.rules` file with permissive rules for development:

```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      // authenticated users may only read/write their own profile
      allow read, write: if request.auth != null && request.auth.uid == userId;
      // any nested collections (moods, alerts, reports, etc.) are protected
      match /{subcollection=**}/{docId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

When running the Firebase emulator, these rules are loaded automatically (see `firebase.json`). For development the included `firestore.rules` file is extremely permissive (`allow read, write: if true;`), which ensures all reads/writes succeed.

To use the same loose rules against your real Firebase project, deploy them with:

```bash
firebase deploy --only firestore:rules
```

**⚠️ Warning:** Wide-open rules are insecure and should be replaced with proper restrictions before deploying to production. At minimum, restrict access to authenticated users or to the matching UID as shown earlier in this README.

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

**Note**: Camera functionality requires HTTPS in production or localhost in development.

## Future Enhancements

- Real AI model integration
- Backend API connection
- Database persistence
- Email notifications
- PDF export functionality
- Multi-language support
- Mobile app version

## License

© 2026 ElderCare System. All rights reserved.

## Support

For issues or questions about testing in VS Code, check:
1. All dependencies are installed
2. Development server is running
3. Browser console for errors
4. Camera permissions are granted (for mood detection)
