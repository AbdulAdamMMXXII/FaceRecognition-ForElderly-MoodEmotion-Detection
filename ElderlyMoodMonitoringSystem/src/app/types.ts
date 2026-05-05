// Type definitions for the caregiver dashboard

export type EmotionType = 'happy' | 'sad' | 'neutral' | 'stressed' | 'anxious' | 'confused';

export type AlertSeverity = 'low' | 'medium' | 'high';

export type AlertStatus = 'sent' | 'acknowledged' | 'resolved';

export interface MoodReading {
  id: string;
  emotion: EmotionType;
  confidence: number;
  timestamp: Date;
  explanation?: {
    elderlyMessage?: string;
    caregiverSummary?: string;
    reportSummary?: string;
    insights?: string[];
    riskLevel?: 'low' | 'medium' | 'high';
    source?: string;
    modelUsed?: string;
    generatedAt?: Date;
  };
}

export interface Alert {
  id: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  timestamp: Date;
  status: AlertStatus;
}

export interface Report {
  id: string;
  title: string;
  summary: string;
  analysisNarrative?: string;
  caregiverSummary?: string;
  riskLevel?: 'low' | 'medium' | 'high';
  generatedAt: Date;
  period: string;
  insights: string[];
  source?: string;
  modelUsed?: string;
  llmStatus?: 'success' | 'error';
  llmErrorCode?: string;
  moodId?: string;
  emotion?: string;
  confidence?: number;
}

export interface ElderlyProfile {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  age: number;
  photo: string;
  monitoringStatus: 'active' | 'inactive';
  deviceStatus: 'online' | 'offline';
  lastActivity: Date;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  preferences?: {
    theme?: 'light' | 'dark' | 'system';
    largeText?: boolean;
  };
  // optional latest mood snapshot for quick display
  latestMood?: {
    emotion: EmotionType;
    confidence: number;
    timestamp: Date;
  };
  latestExplanation?: {
    moodId?: string;
    message?: string;
    riskLevel?: 'low' | 'medium' | 'high';
    source?: string;
    modelUsed?: string;
    generatedAt?: Date;
  };
  caregiver?: {
    name: string;
    email: string;
    notifyAfterCount?: number;
    notifyConsecutiveCount?: number;
    summaryFrequency?: string;
    verified?: boolean;
    verifiedAt?: Date;
  };
}

export interface MoodTrend {
  date: string;
  happy: number;
  sad: number;
  neutral: number;
  stressed: number;
  anxious: number;
  confused: number;
}
