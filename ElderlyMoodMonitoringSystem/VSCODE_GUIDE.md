# VS Code Testing Guide

## Quick Start

1. **Open Project in VS Code**
   - Open VS Code
   - File → Open Folder → Select this project folder

2. **Open Integrated Terminal**
   - View → Terminal (or Ctrl+\` / Cmd+\`)

3. **Install Dependencies**
   \`\`\`bash
   npm install
   \`\`\`

4. **Start Development Server**
   \`\`\`bash
   npm run dev
   \`\`\`

5. **Open in Browser**
   - Click on the local URL in terminal (e.g., http://localhost:5173)
   - Or Ctrl+Click (Cmd+Click on Mac) to open directly

## Testing Flow

### 1. Authentication
- Start at login page (http://localhost:5173/login)
- Enter any email: `test@example.com`
- Enter any password: `password123`
- Click "Sign In"

### 2. Dashboard
- View real-time mood status
- See monitoring indicators
- Check color-coded emotion states

### 3. Mood Detection (Camera Feature)
- Navigate to "Mood Detection" in sidebar
- Option 1: Click "Use Camera" (grant permissions when prompted)
- Option 2: Click "Upload Image" and select a photo
- Click "Analyze Mood" to see results

### 4. Other Features
- **Analytics**: View interactive charts
- **Alerts**: Filter and view system alerts
- **Reports**: Read AI-generated summaries
- **Profile**: View user information

### 5. Logout
- Click "Logout" in sidebar to return to login

## Troubleshooting

### Port Already in Use
If port 5173 is taken:
\`\`\`bash
npm run dev -- --port 3000
\`\`\`

### Camera Not Working
1. Check browser permissions
2. Use HTTPS or localhost only
3. Try Chrome browser (best support)

### Dependencies Error
\`\`\`bash
rm -rf node_modules
npm install
\`\`\`

### Build Errors
\`\`\`bash
npm run build
\`\`\`

## VS Code Extensions (Optional but Recommended)

- **ES7+ React/Redux/React-Native snippets** - For React development
- **Tailwind CSS IntelliSense** - For Tailwind classes
- **TypeScript Error Translator** - For better TS errors
- **Pretty TypeScript Errors** - Prettier error messages

## Project Commands

\`\`\`bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
\`\`\`

## File Structure for Editing

Key files you might want to modify:

### Pages (in \`/src/app/pages/\`)
- \`Dashboard.tsx\` - Main dashboard view
- \`MoodDetection.tsx\` - Image upload & camera
- \`Analytics.tsx\` - Charts and trends
- \`Alerts.tsx\` - Alert management
- \`Reports.tsx\` - AI reports
- \`Profile.tsx\` - User profile
- \`Login.tsx\` - Login form
- \`SignUp.tsx\` - Registration form

### Data (in \`/src/app/data/\`)
- Firestore collections now supply live data (previously used mockData.ts)

### Routes (in \`/src/app/\`)
- \`routes.ts\` - Route configuration

### Components (in \`/src/app/components/\`)
- \`Layout.tsx\` - Sidebar navigation
- \`ProtectedRoute.tsx\` - Authentication guard

## Testing Checklist

- [ ] Login page loads correctly
- [ ] Can sign in with any credentials
- [ ] Dashboard displays mood information
- [ ] Camera can be activated (with permissions)
- [ ] Image upload works
- [ ] Mood detection returns results
- [ ] Analytics charts render properly
- [ ] Alerts can be filtered
- [ ] Reports display correctly
- [ ] Profile shows user info
- [ ] Logout returns to login page

## Notes

- Authentication is handled by Firebase Auth (demo credentials accepted)
- AI detection runs in-browser with face-api models, not simulated
- Data is stored in Firestore collections under each user
- Camera requires HTTPS in production (localhost works in dev)
- Application is optimized for desktop/tablet viewing

## Getting Help

If you encounter issues:
1. Check the browser console (F12)
2. Look at terminal for build errors
3. Verify all dependencies installed
4. Ensure Node.js version is 16+
5. Try clearing browser cache

Happy testing! 🚀
