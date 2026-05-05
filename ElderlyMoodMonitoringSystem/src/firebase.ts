// src/firebase.ts
// central entry point for Firebase initialization and exports

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

// configuration copied from user snippet (should be kept secret in env variables for production)
const firebaseConfig = {
  apiKey: "AIzaSyAg5cr827teWc8cZpnga9poEMjFZV175HI",
  authDomain: "elderly-mood-monitoring.firebaseapp.com",
  projectId: "elderly-mood-monitoring",
  storageBucket: "elderly-mood-monitoring.firebasestorage.app",
  messagingSenderId: "949205513833",
  appId: "1:949205513833:web:95892f651d088da6eb14f8",
  measurementId: "G-9PTXNNX7YQ"
};

// Initialize Firebase app
export const app = initializeApp(firebaseConfig);

// services that we will use throughout the application
export const auth = getAuth(app);
export const db = getFirestore(app);
// Analytics may not be available in non-browser environments (or without a measurementId).
// Initialize it defensively and export `null` if it's unavailable to avoid runtime errors.
export let analytics: any = null;
try {
  if (typeof window !== 'undefined' && firebaseConfig && firebaseConfig.measurementId) {
    analytics = getAnalytics(app);
  }
} catch (err) {
  console.warn('Firebase analytics not initialized:', err);
}

// flag exported to indicate emulator connection status
export let emulatorConnected = false;

// During local development, attempt to connect to emulators automatically,
// but only if both the Auth and Firestore emulator endpoints are reachable.
// This prevents a partial connection (auth connected but emulator not running)
// which can cause `permission-denied` for writes when the Firestore emulator
// expects emulator-auth tokens.
const useEmulators = import.meta.env.DEV;
async function isReachable(url: string, timeout = 1000): Promise<boolean> {
  // If `fetch` or `AbortController` aren't available (e.g. certain Node runtimes),
  // treat the endpoint as unreachable rather than throwing.
  const g = globalThis as any;
  const Fetch = typeof g.fetch === 'function' ? g.fetch : null;
  const AC = typeof g.AbortController === 'function' ? g.AbortController : null;
  if (!Fetch || !AC) return false;
  try {
    const controller = new AC();
    const id = setTimeout(() => controller.abort(), timeout);
    // use no-cors to avoid CORS failures turning into false negatives
    await Fetch(url, { method: 'GET', mode: 'no-cors', signal: controller.signal });
    clearTimeout(id);
    return true;
  } catch (err) {
    return false;
  }
}

if (useEmulators) {
  (async () => {
    const firestoreUp = await isReachable('http://localhost:8080');
    const authUp = await isReachable('http://localhost:9099');
    if (!firestoreUp && !authUp) {
      console.warn('No Firebase emulators reachable. firestoreUp=', firestoreUp, 'authUp=', authUp);
      console.log('To use emulators run: firebase emulators:start --only auth,firestore');
    }

    // Connect to any emulator that is reachable. This allows using Firestore
    // emulator without requiring the Auth emulator to be running.
    if (firestoreUp) {
      try {
        const firestoreModule = await import('firebase/firestore');
        if (firestoreModule && firestoreModule.connectFirestoreEmulator) {
          firestoreModule.connectFirestoreEmulator(db, 'localhost', 8080);
          console.log('Connected Firestore to emulator at localhost:8080');
          emulatorConnected = true;
        }
      } catch (err) {
        console.warn('Could not connect Firestore emulator:', err);
      }
    }

    if (authUp) {
      try {
        const authModule = await import('firebase/auth');
        if (authModule && authModule.connectAuthEmulator) {
          authModule.connectAuthEmulator(auth, 'http://localhost:9099');
          console.log('Connected Auth to emulator at localhost:9099');
          emulatorConnected = true;
        }
      } catch (err) {
        console.warn('Could not connect Auth emulator:', err);
      }
    }
  })();
}

// default export in case a module wants to reference the app itself
export default app;
