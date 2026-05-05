# 📊 Elderly Mood Monitoring System - Complete Technical Stack

## **Languages**
- **TypeScript** – Primary language for frontend (type-safe React, type definitions)
- **JavaScript** – Backend Cloud Functions (Node.js v20 runtime)
- **JSX/TSX** – React component syntax
- **CSS** – Styling with Tailwind CSS v4 (compiled from PostCSS pipeline)
- **HTML** – Page structure and layouts

---

## **Frontend Framework & UI**

### React Ecosystem
- **React 18.3.1** – UI library for building interactive components
- **React Router 7.13.0** – Client-side routing and navigation
- **React DOM 18.3.1** – React rendering to DOM

### UI Components & Design System
- **Radix UI** – Headless, accessible component primitives
  - Dialog, Popover, Dropdown Menu, Accordion, Tabs, Slider, Progress, etc.
  - 30+ Radix UI component libraries integrated
- **Lucide React 0.487.0** – Icon library for UI elements
- **Shadcn/ui** – Built on Radix UI with Tailwind styling

### Styling & Theme
- **Tailwind CSS v4.1.12** – Utility-first CSS framework
- **@tailwindcss/vite 4.1.12** – Vite plugin for Tailwind
- **class-variance-authority 0.7.1** – Compile-time variant library
- **clsx 2.1.1** – Conditional classname utility
- **tailwind-merge 3.2.0** – Merge Tailwind classes without conflicts
- **PostCSS 4.x** – CSS processing (via Tailwind Vite plugin)

### Animation & Motion
- **Motion 12.23.24** – Animation library for smooth transitions
- **embla-carousel-react 8.6.0** – Image carousel component
- **react-slick 0.31.0** – Slider/carousel functionality
- **tw-animate-css 1.3.8** – Tailwind animation utilities

### Form Handling
- **react-hook-form 7.55.0** – Lightweight form state & validation
- **input-otp 1.4.2** – One-time password input component

### Data Display & Charts
- **recharts 2.15.2** – Composable React chart library
  - Line charts, Bar charts, Pie charts, Area charts for mood trends
  - Responsive design-aware

### Other UI Libraries
- **Material UI (MUI) 7.3.5** – Material-UI icons and components
- **next-themes 0.4.6** – Dark mode theme management
- **sonner 2.0.3** – Toast notification library
- **vaul 1.1.2** – Drawer component
- **date-fns 3.6.0** – Date manipulation and formatting

### Advanced UI Features
- **react-dnd 16.0.1** + **react-dnd-html5-backend 16.0.1** – Drag-and-drop functionality
- **react-responsive-masonry 2.7.1** – Masonry layout grid
- **react-popper 2.3.0** – Popper.js for tooltips and popovers
- **react-resizable-panels 2.1.7** – Resizable layout panels
- **cmdk 1.1.1** – Command palette/search component

---

## **Backend & Database**

### Firebase (Google Cloud)
- **firebase 12.9.0** – Client SDK for Firestore, Auth, Cloud Functions
- **firebase-admin 11.0.0** – Admin SDK for server-side operations
- **firebase-functions 7.0.6** – Framework for serverless functions (v2 runtime)

### Database
- **Cloud Firestore (NoSQL)** – Real-time database for user profiles, moods, alerts, reports, caregiver requests
- Collections:
  - `users/{uid}` – User profiles with theme/preferences
  - `users/{uid}/moods` – Historical mood readings with emotion & confidence
  - `users/{uid}/alerts` – Alert history based on mood thresholds
  - `users/{uid}/reports` – Generated PDF/summary reports
  - `caregiverRequests/{uid}` – Verification tokens for caregiver setup

### Authentication
- **Firebase Authentication** – User login/signup with email
- Password-based authentication
- Session management via JWT tokens

### Email & Notifications
- **nodemailer 6.9.1** – SMTP email delivery to Gmail
- **Gmail SMTP** – Configured for caregiver verification emails
  - Address: `noreply@elderly-mood-monitoring.firebaseapp.com`
  - Port: 587 (TLS)
  - Async email sending in Cloud Functions

### Report Generation
- **pdfkit 0.13.0** – PDF document generation library
  - Dynamic caregiver summary reports with statistics

---

## **AI & Computer Vision**

### Face Detection & Emotion Recognition
- **@vladmandic/face-api 1.7.15** – TensorFlow.js-based face detection library
  - **Tiny Face Detector** – Lightweight face detection model
  - **Face Expression Net** – Real-time emotion classification
  - Detects: happy, sad, angry, fearful, disgusted, surprised, neutral
  - Confidence scoring (0-1)

### On-Device AI Inference
- **TensorFlow.js** (dependency of face-api)
  - WebGL backend for GPU acceleration
  - Canvas-based image processing
  - No server-side inference needed (privacy-preserving)

### Model Serving
- Models hosted locally in `/public/models/` + CDN fallback:
  - `tiny_face_detector_model-weights_manifest.json`
  - `face_expression_model-weights_manifest.json`
  - Loaded on demand with multi-source fallback (local, GitHub, cdnjs)

---

## **Build Tools & Development**

### Build & Dev Server
- **Vite 6.3.5** – Next-generation frontend build tool
  - Lightning-fast HMR (Hot Module Replacement)
  - Optimized production bundles
  - ES module native
- **Vite React Plugin 4.7.0** – Fast Refresh for React

### Package Management
- **npm** (or pnpm) – Dependency management
- **dotenv 17.3.1** – Environment variable loading (.env files)

### Project Structure
```
src/app/
  ├── components/
  │   ├── Layout.tsx
  │   ├── ProtectedRoute.tsx
  │   ├── figma/ImageWithFallback.tsx
  │   └── ui/  (30+ Radix UI component wrappers)
  ├── pages/
  │   ├── Dashboard.tsx
  │   ├── MoodDetection.tsx (face-api)
  │   ├── Analytics.tsx (recharts)
  │   ├── Profile.tsx
  │   ├── Reports.tsx
  │   ├── Alerts.tsx
  │   ├── CaregiverVerify.tsx
  │   └── ...
  ├── services/
  │   ├── firestore.ts (Firestore data access)
  │   └── moodAnalyzer.ts (face-api wrapper)
  ├── contexts/AuthContext.tsx (global auth state)
  ├── types.ts (TypeScript interfaces)
  ├── utils/moodUtils.ts (emotion mapping)
  └── styles/
      ├── index.css
      ├── tailwind.css
      ├── theme.css (CSS variables)
      └── fonts.css

functions/
  ├── index.js (Cloud Functions handlers)
  ├── .env (SMTP config, APP_HOST)
  ├── package.json (Node 20)
  └── test_*.js (local testing scripts)
```

---

## **Database Design Patterns**

### Collections & Documents
| Collection | Document | Purpose |
|-----------|----------|---------|
| `users/{uid}` | User profile | Name, age, photo, monitoring status, preferences, caregiver info |
| `caregiverRequests/{uid}` | Verification doc | Token, caregiver email, 24h expiry |
| `users/{uid}/moods` | Mood reading | Emotion, confidence, timestamp, image URL |
| `users/{uid}/alerts` | Alert record | Alert threshold hit, emotion type, consecutive count |
| `users/{uid}/reports` | Report summary | PDF URL, date range, mood trends, caregiver insights |

### Timestamp Handling
- Firestore Timestamps converted to JS Date objects
- ISO string support for cross-platform compatibility
- Safe date formatting in UI (prevents invalid date rendering)

---

## **Cloud Infrastructure**

### Deployment Targets
- **Firebase Hosting** – Frontend SPA host
  - URL: `https://elderly-mood-monitoring.web.app`
  - SPAs with index.html fallback routing
- **Cloud Functions (2nd Gen)** – Backend serverless compute
  - Runtime: Node.js 20
  - Triggers: Firestore document writes, HTTP requests
  - Region: `us-central1`

### Firebase Services Active
- Cloud Firestore (NoSQL)
- Authentication (Email)
- Cloud Functions (onDocumentWritten, onRequest triggers)
- Cloud Storage (optional, for media)
- Firebase Hosting (SPA delivery)

### Local Development
- **Firebase Emulators** – Local Firestore, Auth, Functions emulation
  - Firestore Emulator: `localhost:8080`
  - Functions Emulator: `localhost:5001`
  - Auth Emulator: built-in

---

## **Development & Testing**

### Configuration Files
- **vite.config.ts** – Vite build config + React & Tailwind plugins
- **tsconfig.json** – TypeScript compiler options (strict mode)
- **postcss.config.mjs** – PostCSS pipeline (Tailwind)
- **firebase.json** – Firebase project config (hosting, functions, emulators)
- **firestore.rules** – Firestore security rules
- **firestore.indexes.json** – Composite Firestore indexes

### Environment Variables
- **Frontend** (.env or runtime):
  - Firebase project config (API key, auth domain, etc.)
  - Vite-injected variables

- **Backend** (functions/.env + Firebase config):
  - `SMTP_USER`, `SMTP_PASS`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`
  - `APP_HOST` (production verification link domain)

---

## **Code Quality & Standards**

### Typing & Validation
- **TypeScript strict mode** – Full type checking
- Type definitions in `src/app/types.ts`
- Explicit interfaces: `ElderlyProfile`, `MoodReading`, `Alert`, `Report`

### CSS Architecture
- **CSS Variables** – Theming via custom properties
  - Dark mode: `.dark` class on documentElement
  - Large text: `.large-text` class on html element
  - All component colors derive from variables

### Error Handling
- Try-catch blocks for Firestore operations
- onSnapshot error callbacks for real-time subscriptions
- CloudFunction error logging and graceful degradation

---

## **Key Dependencies Summary**

| Category | Count | Examples |
|----------|-------|----------|
| **Radix UI Components** | 30+ | Dialog, Popover, Dropdown, Accordion, Tabs, Slider, Progress |
| **Form/Input** | 5 | react-hook-form, input-otp, date-fns |
| **Charts & Visualization** | 3 | recharts, embla-carousel, react-slick |
| **State & Context** | 2 | React Hooks, AuthContext (custom) |
| **Animation** | 2 | Motion, Tailwind animations |
| **Drag & Drop** | 2 | react-dnd, react-dnd-html5-backend |
| **AI/ML** | 1 | @vladmandic/face-api (TensorFlow.js) |
| **Backend** | 3 | firebase-admin, firebase-functions, nodemailer |
| **PDF** | 1 | pdfkit |

---

## **Security & Privacy Considerations**

### On-Device Processing
- Face detection & emotion analysis runs **entirely in browser** (no uploads to third parties)
- Image data never leaves user's device (canvas-based processing)
- TensorFlow.js WebGL backend for efficient computation

### Backend Security
- Firebase Firestore security rules protect data
- Cloud Functions validate tokens and requests
- SMTP over TLS for email encryption
- Environment variables protect sensitive credentials

### Data Minimization
- Prompts sent to potential future LLM APIs exclude raw health data
- Caregiver emails verified with one-time tokens
- Session-based authentication with JWT

---

## **Performance Optimizations**

- **Code Splitting** – Dynamic imports for route-based code splitting
- **Image Optimization** – WebP support, lazy loading
- **CSS Optimization** – Tailwind purge (unused classes removed)
- **JS Bundle** – ~700KB gzipped (monitored for size)
- **Chart Rendering** – Recharts optimized for large datasets
- **Real-Time Updates** – Firestore onSnapshot for efficient live data

---

## **Summary**

This is a **full-stack mood monitoring SPA** featuring:
- ✅ **On-device emotion detection** via face-api.js (privacy-first)
- ✅ **Real-time mood tracking** with Firestore
- ✅ **Beautiful, accessible UI** with Radix UI + Tailwind
- ✅ **Serverless backend** with Cloud Functions & email
- ✅ **Multi-theme support** (dark mode + large text)
- ✅ **Caregiver notifications** with verified email flow
- ✅ **Analytics & reporting** with chart visualization
- ✅ **TypeScript throughout** for maintainability

**Total tech stack: ~100+ dependencies** across JavaScript ecosystem, with clear separation between frontend (React/Tailwind), backend (Node.js/Firebase), and AI inference (TensorFlow.js).
