// src/app/services/firestore.ts
// simple helpers for interacting with Firestore documents/collections used by the app

import { 
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  collection,
  addDoc,
  query,
  orderBy,
  getDocs
} from 'firebase/firestore';
import { db } from '../../firebase';
import { auth } from '../../firebase';
import type { ElderlyProfile, MoodReading, Alert, Report, MoodTrend } from '../types';

// Convert Firestore Timestamp objects to JS Date where applicable
function normalizeTimestamps<T>(obj: T): T {
  // Recursively convert Firestore Timestamp objects to JS Date and parse ISO strings.
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map((v) => normalizeTimestamps(v)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj as Record<string, any>)) {
      if (v && typeof v.toDate === 'function') {
        try {
          out[k] = v.toDate();
        } catch (e) {
          out[k] = v;
        }
      } else if (typeof v === 'object') {
        out[k] = normalizeTimestamps(v);
      } else {
        out[k] = v;
      }
    }
    return out as T;
  }
  return obj;
}

function asDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'object' && typeof (value as any).toDate === 'function') {
    try {
      return (value as any).toDate();
    } catch (e) {
      return null;
    }
  }
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

function extractRecordDate(raw: Record<string, any>): Date | null {
  return (
    asDate(raw.timestamp) ||
    asDate(raw.generatedAt) ||
    asDate(raw.createdAt) ||
    asDate(raw.updatedAt) ||
    null
  );
}

function toReport(raw: Record<string, any>, docId: string): Report {
  const normalized = normalizeTimestamps(raw) as Record<string, any>;
  const generatedAt = extractRecordDate(normalized) || new Date();
  const summary = String(
    normalized.summary ||
    normalized.reportSummary ||
    normalized.explanation?.reportSummary ||
    ''
  );

  return {
    id: normalized.id || docId,
    title: String(normalized.title || `Mood Analysis - ${String(normalized.emotion || 'neutral')}`),
    summary,
    analysisNarrative: normalized.analysisNarrative ? String(normalized.analysisNarrative) : undefined,
    caregiverSummary: normalized.caregiverSummary ? String(normalized.caregiverSummary) : undefined,
    riskLevel: ['low', 'medium', 'high'].includes(String(normalized.riskLevel || '').toLowerCase())
      ? String(normalized.riskLevel).toLowerCase() as 'low' | 'medium' | 'high'
      : undefined,
    generatedAt,
    period: String(normalized.period || generatedAt.toLocaleDateString()),
    insights: Array.isArray(normalized.insights)
      ? normalized.insights.map((v: unknown) => String(v))
      : [],
    source: normalized.source ? String(normalized.source) : undefined,
    modelUsed: normalized.modelUsed ? String(normalized.modelUsed) : undefined,
    llmStatus: normalized.llmStatus === 'error' ? 'error' : (normalized.llmStatus === 'success' ? 'success' : undefined),
    llmErrorCode: normalized.llmErrorCode ? String(normalized.llmErrorCode) : undefined,
    moodId: normalized.moodId ? String(normalized.moodId) : undefined,
    emotion: normalized.emotion ? String(normalized.emotion) : undefined,
    confidence: Number.isFinite(Number(normalized.confidence)) ? Number(normalized.confidence) : undefined,
  };
}

export async function createUserProfile(uid: string, data: Partial<ElderlyProfile>) {
  const ref = doc(db, 'users', uid);
  await setDoc(ref, data, { merge: true });
}

export function subscribeToUserProfile(uid: string, callback: (profile: ElderlyProfile | null) => void) {
  const ref = doc(db, 'users', uid);
  // include an error handler so permission errors don't leave UI hanging
  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) return callback(null);
      const data = snap.data() as Record<string, any>;
      const normalized = normalizeTimestamps(data) as Record<string, any>;
      const lastActivity = asDate(normalized.lastActivity) || new Date();
      const latestMoodTimestamp = normalized.latestMood ? (asDate(normalized.latestMood.timestamp) || lastActivity) : null;
      const latestExplanationGeneratedAt = normalized.latestExplanation
        ? (asDate(normalized.latestExplanation.generatedAt) || lastActivity)
        : null;

      callback({
        id: String(normalized.id || uid),
        name: String(normalized.name || 'User'),
        email: normalized.email ? String(normalized.email) : undefined,
        phone: normalized.phone ? String(normalized.phone) : undefined,
        age: Number.isFinite(Number(normalized.age)) ? Number(normalized.age) : 0,
        photo: normalized.photo ? String(normalized.photo) : '',
        monitoringStatus: String(normalized.monitoringStatus || 'active') === 'inactive' ? 'inactive' : 'active',
        deviceStatus: String(normalized.deviceStatus || 'online') === 'offline' ? 'offline' : 'online',
        lastActivity,
        ...normalized,
        latestMood: normalized.latestMood
          ? {
              ...normalized.latestMood,
              emotion: String(normalized.latestMood.emotion || 'neutral'),
              confidence: Number(normalized.latestMood.confidence) || 0,
              timestamp: latestMoodTimestamp || lastActivity,
            }
          : undefined,
        latestExplanation: normalized.latestExplanation
          ? {
              ...normalized.latestExplanation,
              message: normalized.latestExplanation.message ? String(normalized.latestExplanation.message) : undefined,
              source: normalized.latestExplanation.source ? String(normalized.latestExplanation.source) : undefined,
              modelUsed: normalized.latestExplanation.modelUsed ? String(normalized.latestExplanation.modelUsed) : undefined,
              generatedAt: latestExplanationGeneratedAt || lastActivity,
            }
          : undefined,
        caregiver: normalized.caregiver
          ? {
              ...normalized.caregiver,
              name: normalized.caregiver.name ? String(normalized.caregiver.name) : '',
              email: normalized.caregiver.email ? String(normalized.caregiver.email) : '',
              summaryFrequency: normalized.caregiver.summaryFrequency ? String(normalized.caregiver.summaryFrequency) : undefined,
            }
          : undefined,
      } as ElderlyProfile);
    },
    (err) => {
      console.error('subscribeToUserProfile error:', err);
      // surface null so UI can show empty state instead of loading indefinitely
      callback(null);
    }
  );
}

export async function getUserProfile(uid: string): Promise<ElderlyProfile | null> {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    const data = snap.data() as Record<string, any>;
    const normalized = normalizeTimestamps(data) as Record<string, any>;
    const lastActivity = asDate(normalized.lastActivity) || new Date();
    const latestMoodTimestamp = normalized.latestMood ? (asDate(normalized.latestMood.timestamp) || lastActivity) : null;
    const latestExplanationGeneratedAt = normalized.latestExplanation
      ? (asDate(normalized.latestExplanation.generatedAt) || lastActivity)
      : null;

    return {
      id: String(normalized.id || uid),
      name: String(normalized.name || 'User'),
      email: normalized.email ? String(normalized.email) : undefined,
      phone: normalized.phone ? String(normalized.phone) : undefined,
      age: Number.isFinite(Number(normalized.age)) ? Number(normalized.age) : 0,
      photo: normalized.photo ? String(normalized.photo) : '',
      monitoringStatus: String(normalized.monitoringStatus || 'active') === 'inactive' ? 'inactive' : 'active',
      deviceStatus: String(normalized.deviceStatus || 'online') === 'offline' ? 'offline' : 'online',
      lastActivity,
      ...normalized,
      latestMood: normalized.latestMood
        ? {
            ...normalized.latestMood,
            emotion: String(normalized.latestMood.emotion || 'neutral'),
            confidence: Number(normalized.latestMood.confidence) || 0,
            timestamp: latestMoodTimestamp || lastActivity,
          }
        : undefined,
      latestExplanation: normalized.latestExplanation
        ? {
            ...normalized.latestExplanation,
            message: normalized.latestExplanation.message ? String(normalized.latestExplanation.message) : undefined,
            source: normalized.latestExplanation.source ? String(normalized.latestExplanation.source) : undefined,
            modelUsed: normalized.latestExplanation.modelUsed ? String(normalized.latestExplanation.modelUsed) : undefined,
            generatedAt: latestExplanationGeneratedAt || lastActivity,
          }
        : undefined,
      caregiver: normalized.caregiver
        ? {
            ...normalized.caregiver,
            name: normalized.caregiver.name ? String(normalized.caregiver.name) : '',
            email: normalized.caregiver.email ? String(normalized.caregiver.email) : '',
            summaryFrequency: normalized.caregiver.summaryFrequency ? String(normalized.caregiver.summaryFrequency) : undefined,
          }
        : undefined,
    } as ElderlyProfile;
  } catch (err) {
    console.error('getUserProfile error:', err);
    return null;
  }
}

// functions for other collections could be added here
export async function addMoodReading(uid: string, mood: MoodReading): Promise<string> {
  try {
    console.log('addMoodReading: uid=', uid, 'auth.currentUser?.uid=', auth.currentUser?.uid, 'emulatorConnected=', (globalThis as any).emulatorConnected);
    const ref = collection(db, 'users', uid, 'moods');
    const docRef = await addDoc(ref, { ...mood, timestamp: mood.timestamp });
    console.log('Mood reading saved for', uid, mood, 'docId=', docRef.id);

    // Also update a lightweight latestMood snapshot on the user's profile document
    // and set default monitoring/device status to active/online if not already set
    try {
      const profileRef = doc(db, 'users', uid);
      await setDoc(profileRef, {
        latestMood: {
          emotion: mood.emotion,
          confidence: mood.confidence,
          timestamp: mood.timestamp
        },
        // update lastActivity to the mood timestamp as a convenience
        lastActivity: mood.timestamp,
        // set defaults for monitoringStatus and deviceStatus (only if not already set)
        monitoringStatus: 'active',
        deviceStatus: 'online'
      }, { merge: true });
      console.log('Updated user profile latestMood and status for', uid);
    } catch (innerErr) {
      console.warn('Failed to update latestMood on profile for', uid, innerErr);
    }
    return docRef.id;
    } catch (err) {
    console.error('addMoodReading error:', err);
    const code = (err as any)?.code;
    // If permission-denied in DEV and emulators are not connected, try to connect and retry once
    const isDev = Boolean((import.meta as any)?.env?.DEV);
    const emulatorConnectedFlag = (globalThis as any).emulatorConnected;
    if (isDev && code === 'permission-denied' && !emulatorConnectedFlag) {
      console.warn('Permission denied and emulators not connected — attempting to connect emulators and retry (DEV only)');
      try {
        const [fsMod, authMod] = await Promise.all([import('firebase/firestore'), import('firebase/auth')]);
        try {
          if (fsMod && fsMod.connectFirestoreEmulator) fsMod.connectFirestoreEmulator(db, 'localhost', 8080);
          if (authMod && authMod.connectAuthEmulator) authMod.connectAuthEmulator(auth, 'http://localhost:9099');
          (globalThis as any).emulatorConnected = true;
          console.log('Successfully connected to local emulators, retrying write...');
          const refRetry = collection(db, 'users', uid, 'moods');
          const docRef2 = await addDoc(refRetry, { ...mood, timestamp: mood.timestamp });
          console.log('Retry succeeded, docId=', docRef2.id);
          // also update latestMood as before with default status
          try {
            const profileRef = doc(db, 'users', uid);
            await setDoc(profileRef, {
              latestMood: {
                emotion: mood.emotion,
                confidence: mood.confidence,
                timestamp: mood.timestamp
              },
              lastActivity: mood.timestamp,
              monitoringStatus: 'active',
              deviceStatus: 'online'
            }, { merge: true });
          } catch (inner) {
            console.warn('Retry: failed to update latestMood after retry write', inner);
          }
          return docRef2.id;
        } catch (retryErr) {
          console.error('Retry write failed:', retryErr);
        }
      } catch (importErr) {
        console.error('Failed to import firebase modules for emulator connect:', importErr);
      }
    }

    // enrich permission errors with actionable guidance for developers
    if (code === 'permission-denied') {
      const e: any = new Error('Missing or insufficient permissions. Ensure Firebase emulators are running (auth + firestore) in dev, or deploy proper Firestore rules.');
      e.code = 'permission-denied';
      throw e;
    }
    // rethrow other errors
    throw err;
  }
}

export function subscribeMoodTrend(uid: string, callback: (trends: MoodTrend[]) => void) {
  // read individual mood readings then aggregate into daily percentages
  const ref = collection(db, 'users', uid, 'moods');
  return onSnapshot(ref, (snap) => {
    type Counts = { happy: number; sad: number; neutral: number; stressed: number; anxious: number; confused: number; total: number };
    const map: Record<string, Counts> = {};
    snap.forEach((doc) => {
      const data = normalizeTimestamps(doc.data() as Record<string, any>) as Record<string, any>;
      const when = extractRecordDate(data);
      const dateStr = when ? when.toISOString().slice(0, 10) : '';
      if (!dateStr) return;
      if (!map[dateStr]) {
        map[dateStr] = { happy: 0, sad: 0, neutral: 0, stressed: 0, anxious: 0, confused: 0, total: 0 };
      }
      const emotion = String(data.emotion || 'neutral') as keyof Counts;
      if (typeof map[dateStr][emotion] === 'number') {
        map[dateStr][emotion] = (map[dateStr][emotion] || 0) + 1;
      }
      map[dateStr].total += 1;
    });
    let arr: MoodTrend[] = Object.entries(map).map(([date, counts]) => {
      const pct = (n: number) => (counts.total ? Math.round((n / counts.total) * 100) : 0);
      return {
        date,
        happy: pct(counts.happy),
        sad: pct(counts.sad),
        neutral: pct(counts.neutral),
        stressed: pct(counts.stressed),
        anxious: pct(counts.anxious),
        confused: pct(counts.confused),
      };
    });
    // sort by date ascending
    arr = arr.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    callback(arr);
  });
}

export function subscribeMoodReadings(uid: string, callback: (moods: MoodReading[]) => void) {
  const ref = collection(db, 'users', uid, 'moods');
  return onSnapshot(ref, (snap) => {
    const arr: MoodReading[] = [];
    snap.forEach((docSnap) => {
      const raw = docSnap.data() as Record<string, any>;
      const normalized = normalizeTimestamps(raw) as Record<string, any>;
      const timestamp = extractRecordDate(normalized) || new Date();
      arr.push({
        ...(normalized as MoodReading),
        id: normalized.id || docSnap.id,
        timestamp,
      });
    });
    arr.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    callback(arr);
  });
}

export function subscribeMoodReading(uid: string, moodId: string, callback: (mood: MoodReading | null) => void) {
  const ref = doc(db, 'users', uid, 'moods', moodId);
  return onSnapshot(ref, (snap) => {
    if (!snap.exists()) return callback(null);
    const raw = snap.data() as Record<string, any>;
    const normalized = normalizeTimestamps(raw) as Record<string, any>;
    callback({
      ...(normalized as MoodReading),
      id: normalized.id || snap.id,
      timestamp: extractRecordDate(normalized) || new Date(),
    });
  });
}

// alerts helpers
export function subscribeAlerts(uid: string, callback: (alerts: Alert[]) => void) {
  const ref = collection(db, 'users', uid, 'alerts');
  const q = query(ref, orderBy('timestamp', 'desc'));
  return onSnapshot(q, (snap) => {
    const arr: Alert[] = [];
    snap.forEach((doc) => {
      const raw = doc.data() as Record<string, any>;
      arr.push(normalizeTimestamps(raw) as Alert);
    });
    callback(arr);
  });
}

export async function addAlert(uid: string, alert: Alert) {
  try {
    const ref = collection(db, 'users', uid, 'alerts');
    await addDoc(ref, { ...alert, timestamp: alert.timestamp });
    console.log('Alert saved for', uid, alert);
  } catch (err) {
    console.error('addAlert error:', err);
    throw err;
  }
}

// latest mood helpers
export async function getLatestMood(uid: string): Promise<MoodReading | null> {
  const ref = collection(db, 'users', uid, 'moods');
  const snap = await getDocs(ref);
  if (snap.empty) return null;
  const rows = snap.docs
    .map((docSnap) => {
      const normalized = normalizeTimestamps(docSnap.data() as Record<string, any>) as Record<string, any>;
      return {
        ...(normalized as MoodReading),
        id: normalized.id || docSnap.id,
        timestamp: extractRecordDate(normalized) || new Date(0),
      } as MoodReading;
    })
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  return rows[0] || null;
}

export function subscribeLatestMood(uid: string, callback: (mood: MoodReading | null) => void) {
  const ref = collection(db, 'users', uid, 'moods');
  return onSnapshot(ref, (snap) => {
    if (snap.empty) return callback(null);
    const rows = snap.docs
      .map((docSnap) => {
        const normalized = normalizeTimestamps(docSnap.data() as Record<string, any>) as Record<string, any>;
        return {
          ...(normalized as MoodReading),
          id: normalized.id || docSnap.id,
          timestamp: extractRecordDate(normalized) || new Date(0),
        } as MoodReading;
      })
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    callback(rows[0] || null);
  });
}

// reports helpers
export function subscribeReports(uid: string, callback: (reports: Report[]) => void) {
  const reportsRef = collection(db, 'users', uid, 'reports');
  const moodsRef = collection(db, 'users', uid, 'moods');

  let explicitReports: Report[] = [];
  let derivedReports: Report[] = [];

  const emit = () => {
    const deduped = new Map<string, Report>();

    explicitReports.forEach((report) => {
      const key = report.moodId ? `mood:${report.moodId}` : `report:${report.id}`;
      deduped.set(key, report);
    });

    derivedReports.forEach((report) => {
      const key = report.moodId ? `mood:${report.moodId}` : `report:${report.id}`;
      if (!deduped.has(key)) deduped.set(key, report);
    });

    const combined = Array.from(deduped.values()).sort(
      (a, b) => (b.generatedAt?.getTime?.() || 0) - (a.generatedAt?.getTime?.() || 0)
    );
    callback(combined);
  };

  const unsubReports = onSnapshot(reportsRef, (snap) => {
    const arr: Report[] = [];
    snap.forEach((docSnap) => {
      const raw = docSnap.data() as Record<string, any>;
      arr.push(toReport(raw, docSnap.id));
    });
    explicitReports = arr;
    emit();
  });

  const unsubMoods = onSnapshot(moodsRef, (snap) => {
    const arr: Report[] = [];
    snap.forEach((docSnap) => {
      const raw = normalizeTimestamps(docSnap.data() as Record<string, any>) as Record<string, any>;
      const explanation = raw.explanation as Record<string, any> | undefined;
      if (!explanation || !explanation.reportSummary) return;

      const generatedAt = extractRecordDate(explanation) || extractRecordDate(raw) || new Date();
      arr.push({
        id: `derived-${docSnap.id}`,
        moodId: docSnap.id,
        title: `Mood Analysis - ${String(raw.emotion || 'neutral')}`,
        summary: String(explanation.reportSummary),
        analysisNarrative: explanation.analysisNarrative ? String(explanation.analysisNarrative) : undefined,
        caregiverSummary: explanation.caregiverSummary ? String(explanation.caregiverSummary) : undefined,
        riskLevel: ['low', 'medium', 'high'].includes(String(explanation.riskLevel || '').toLowerCase())
          ? String(explanation.riskLevel).toLowerCase() as 'low' | 'medium' | 'high'
          : undefined,
        generatedAt,
        period: generatedAt.toLocaleDateString(),
        insights: Array.isArray(explanation.insights) ? explanation.insights.map((v: unknown) => String(v)) : [],
        source: explanation.source ? String(explanation.source) : undefined,
        modelUsed: explanation.modelUsed ? String(explanation.modelUsed) : undefined,
        llmStatus: explanation.llmStatus === 'error' ? 'error' : (explanation.llmStatus === 'success' ? 'success' : undefined),
        llmErrorCode: explanation.llmErrorCode ? String(explanation.llmErrorCode) : undefined,
        emotion: raw.emotion ? String(raw.emotion) : undefined,
        confidence: Number.isFinite(Number(raw.confidence)) ? Number(raw.confidence) : undefined,
      });
    });
    derivedReports = arr;
    emit();
  });

  return () => {
    unsubReports();
    unsubMoods();
  };
}

export async function addReport(uid: string, report: Report) {
  try {
    const ref = collection(db, 'users', uid, 'reports');
    await addDoc(ref, { ...report, generatedAt: report.generatedAt });
    console.log('Report saved for', uid, report.id);
  } catch (err) {
    console.error('addReport error:', err);
    throw err;
  }
}

// Auto-generate a report from mood analysis
export async function generateMoodReport(uid: string, mood: { emotion: string; confidence: number }): Promise<void> {
  try {
    const timestamp = new Date();
    const reportInsights: string[] = [];

    // Create insights based on emotion and confidence
    if (mood.confidence >= 0.8) {
      reportInsights.push(`Strong ${mood.emotion} emotion detected with ${Math.round(mood.confidence * 100)}% confidence.`);
    } else if (mood.confidence >= 0.6) {
      reportInsights.push(`Moderate ${mood.emotion} emotion detected (${Math.round(mood.confidence * 100)}% confidence).`);
    } else {
      reportInsights.push(`Unclear emotion detected (${Math.round(mood.confidence * 100)}% confidence). Recommend re-checking.`);
    }

    // Emotion-specific insights
    switch (mood.emotion) {
      case 'happy':
        reportInsights.push('Positive emotional state. Individual appears to be in good spirits.');
        break;
      case 'sad':
        reportInsights.push('Sadness detected. Consider reaching out for support or engagement.');
        break;
      case 'stressed':
        reportInsights.push('Stress indicators detected. May benefit from relaxation activities.');
        break;
      case 'anxious':
        reportInsights.push('Anxiety signs detected. Monitoring recommended.');
        break;
      case 'confused':
        reportInsights.push('Confusion detected. May need assistance or clarity on tasks.');
        break;
      case 'neutral':
        reportInsights.push('Neutral emotional state. Individual appears calm and focused.');
        break;
    }

    reportInsights.push('Regular mood monitoring helps track emotional well-being patterns over time.');

    const report: Report = {
      id: crypto.randomUUID(),
      title: `Mood Analysis - ${mood.emotion.charAt(0).toUpperCase() + mood.emotion.slice(1)}`,
      summary: `AI analysis detected a ${mood.emotion} emotional state with ${Math.round(mood.confidence * 100)}% confidence. Detailed recommendations are provided below.`,
      generatedAt: timestamp,
      period: timestamp.toLocaleDateString(),
      insights: reportInsights
    };

    await addReport(uid, report);
  } catch (err) {
    console.error('Failed to generate mood report:', err);
  }
}

// Request caregiver verification: write a caregiver request document that
// a Cloud Function will pick up and email a verification link to the caregiver.
export async function requestCaregiverVerification(uid: string, caregiver: { name: string; email: string; notifyAfterCount?: number; notifyConsecutiveCount?: number; summaryFrequency?: string }) {
  try {
    const reqRef = doc(db, 'caregiverRequests', uid);
    const token = crypto.randomUUID();
    const payload = {
      uid,
      caregiver,
      token,
      requestedAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h
    } as Record<string, any>;
    await setDoc(reqRef, payload, { merge: true });
    console.log('Created caregiver verification request for', uid, caregiver.email);
  } catch (err) {
    console.error('requestCaregiverVerification error:', err);
    throw err;
  }
}

// Allow replacing the caregiver (only via verified flow on server). Client-side
// helper to request a replacement: writes a new caregiver request which will be
// processed and then the server will update users/{uid}.caregiver after verification.
export async function requestCaregiverChange(uid: string, caregiver: { name: string; email: string; notifyAfterCount?: number; notifyConsecutiveCount?: number; summaryFrequency?: string }) {
  return requestCaregiverVerification(uid, caregiver);
}

